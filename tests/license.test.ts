import assert from "node:assert/strict";
import {
  buildPayload, generateKeyPair, normalizeDeviceId, publicKeyFromSeed, signLicense,
  verifyLicense, pyJson, isValidSeedHex, hasFeature,
} from "../src/lib/licenseCore";
import { PLANS, DEFAULT_PROJECTS, groupFeatures, moduleForKey } from "../src/lib/catalog";

const { privateKeyHex, publicKeyHex } = generateKeyPair();
assert.ok(isValidSeedHex(privateKeyHex));
assert.equal(publicKeyFromSeed(privateKeyHex), publicKeyHex);

// pyJson matches Python json.dumps(sort_keys=True)
assert.equal(pyJson({ b: 1, a: [true, null, "é\n"], c: { z: 1, y: "x" } }), '{"a": [true, null, "\\u00e9\\n"], "b": 1, "c": {"y": "x", "z": 1}}');

const now = new Date("2026-10-25T10:00:00Z");
const nowMs = now.getTime();
const web = DEFAULT_PROJECTS.find((p) => p.code === "retailx_360_web")!;
const darzi = DEFAULT_PROJECTS.find((p) => p.code === "darzihub")!;
assert.equal(web.legacy, true);
assert.equal(darzi.legacy, false);

// RetailX-style (legacy) license: no extra fields
const p1 = buildPayload({
  machineId: "ABCD-1234-HW", clientName: "Ali Store", planName: "standard", maxUsers: 5,
  features: PLANS.standard.features, expiry: { days: 30 }, idFormat: "any",
  project: { code: web.code, legacy: true }, now,
});
assert.equal(p1.expiry_date, "2026-11-24");
assert.equal(p1.project_code, undefined);
assert.deepEqual(Object.keys(p1).sort(), ["client_name", "created_at", "expiry_date", "features", "is_lifetime", "machine_id", "max_users", "plan_name"]);
const lic1 = signLicense(p1, privateKeyHex);
assert.ok(lic1.startsWith("MPOS-LIC-"));

let r = verifyLicense(lic1, { publicKeyHex, machineId: "abcd-1234-hw", now: nowMs + 86400000 });
assert.equal(r.ok, true);
if (r.ok) { assert.ok(hasFeature(r.payload, "pos.billing")); assert.ok(!hasFeature(r.payload, "warehouse.transfer")); }

// expiry, machine, tamper, other key, clock
assert.equal((verifyLicense(lic1, { publicKeyHex, now: nowMs + 31 * 86400000 }) as any).reason, "expired");
assert.equal((verifyLicense(lic1, { publicKeyHex, machineId: "OTHER", now: nowMs }) as any).reason, "machine");
const parts = lic1.slice(9).split(".");
const evil = Buffer.from(JSON.stringify({ ...p1, is_lifetime: true })).toString("base64url");
assert.equal((verifyLicense(`MPOS-LIC-${evil}.${parts[1]}`, { publicKeyHex, now: nowMs }) as any).reason, "signature");
assert.equal((verifyLicense(signLicense(p1, generateKeyPair().privateKeyHex), { publicKeyHex, now: nowMs }) as any).reason, "signature");
assert.equal((verifyLicense(lic1, { publicKeyHex, now: nowMs, lastSeen: nowMs + 5 * 86400000 }) as any).reason, "clock");
assert.equal((verifyLicense("hello", { publicKeyHex }) as any).reason, "format");

// own projects: bound to project_code + hex20 device id
const DID = "a1b2c-3d4e5-f6a7b-8c9d0";
assert.equal(normalizeDeviceId(DID), "A1B2-C3D4-E5F6-A7B8-C9D0");
const p2 = buildPayload({
  machineId: DID, clientName: "Tailor Bilal", planName: "standard", maxUsers: 1, features: { premium: true },
  expiry: "lifetime", idFormat: "hex20", project: { code: darzi.code, legacy: false }, now,
});
assert.equal(p2.is_lifetime, true);
assert.equal(p2.expiry_date, "2099-12-31");
assert.equal(p2.project_code, "darzihub");
const lic2 = signLicense(p2, privateKeyHex);
assert.equal(verifyLicense(lic2, { publicKeyHex, machineId: "A1B2-C3D4-E5F6-A7B8-C9D0", projectCode: "darzihub", now: nowMs + 9e11 }).ok, true);
assert.equal((verifyLicense(lic2, { publicKeyHex, projectCode: "bpjourney", now: nowMs }) as any).reason, "project");
assert.throws(() => buildPayload({ ...{ machineId: "zz", clientName: "x", planName: "p", maxUsers: 1, features: {}, expiry: "lifetime" as const, idFormat: "hex20" as const } }));

// explicit date, past date rejected
assert.equal(buildPayload({ machineId: "M1", clientName: "x", planName: "p", maxUsers: 1, features: {}, expiry: { date: "2027-01-01" }, idFormat: "any", now }).expiry_date, "2027-01-01");
assert.throws(() => buildPayload({ machineId: "M1", clientName: "x", planName: "p", maxUsers: 1, features: {}, expiry: { date: "2020-01-01" }, idFormat: "any", now }));

// catalog sanity
assert.equal(Object.keys(PLANS.enterprise_erp.features).length, 84);
assert.equal(moduleForKey("pos.billing"), "pos");
assert.equal(moduleForKey("offline_sales"), "apk");
assert.ok(groupFeatures(PLANS.standard.features).length >= 8);

// dump one license for the Python cross-check
if (process.argv[2]) {
  require("node:fs").writeFileSync(process.argv[2], JSON.stringify({ publicKeyHex, privateKeyHex, license: lic1, license2: lic2 }));
}
console.log("license tests: all passed");
