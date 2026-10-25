import assert from "node:assert/strict";
import {
  buildPayload,
  generateKeyPair,
  normalizeDeviceId,
  publicKeyFromSecret,
  signLicense,
  verifyLicense,
} from "../src/lib/licenseCore";

const { publicKey, secretKey } = generateKeyPair();
assert.equal(publicKeyFromSecret(secretKey), publicKey);

const DID = "a1b2c-3d4e5-f6a7b-8c9d0"; // messy input
assert.equal(normalizeDeviceId(DID), "A1B2-C3D4-E5F6-A7B8-C9D0");
assert.equal(normalizeDeviceId("zzzz"), null);

const now = 1_800_000_000;
const p = buildPayload({ app: "DarziHub", deviceId: DID, name: "Ali", days: 30, now });
const lic = signLicense(p, secretKey);
const base = { publicKeyB64: publicKey, app: "darzihub", deviceId: DID };

// valid
let r = verifyLicense(lic, { ...base, now: now + 86400 });
assert.equal(r.ok, true);
if (r.ok) assert.equal(r.daysLeft, 29);

// expiry
r = verifyLicense(lic, { ...base, now: now + 31 * 86400 });
assert.deepEqual(r, { ok: false, reason: "expired" });

// wrong device / app
assert.equal((verifyLicense(lic, { ...base, deviceId: "0000-0000-0000-0000-0000", now }) as any).reason, "device");
assert.equal((verifyLicense(lic, { ...base, app: "other", now }) as any).reason, "app");

// tampered payload
const parts = lic.split(".");
const evil = Buffer.from(JSON.stringify({ ...p, exp: 0 })).toString("base64url");
assert.equal((verifyLicense(`${parts[0]}.${evil}.${parts[2]}`, { ...base, now }) as any).reason, "signature");

// other key can't forge
const other = generateKeyPair();
const forged = signLicense(p, other.secretKey);
assert.equal((verifyLicense(forged, { ...base, now }) as any).reason, "signature");

// clock rollback
assert.equal((verifyLicense(lic, { ...base, now, lastSeen: now + 86400 * 5 }) as any).reason, "clock");

// lifetime
const lp = buildPayload({ app: "darzihub", deviceId: DID, name: "Ali", days: "lifetime", now });
r = verifyLicense(signLicense(lp, secretKey), { ...base, now: now + 86400 * 5000 });
assert.equal(r.ok, true);
if (r.ok) assert.equal(r.daysLeft, null);

// garbage
assert.equal((verifyLicense("hello", { ...base, now }) as any).reason, "format");

console.log("license tests: all passed");
