// Offline logic tests: clients, generate/renew, guards, PIN, catalog view, sync against a scripted fake Hub.
import assert from "node:assert/strict";
import nacl from "tweetnacl";
import { MemorySession, MemoryStore, MemoryVault } from "./memoryStore";
import { Repo } from "../src/lib/store";
import { HubClient } from "../src/lib/hub";
import { generateKeyPair, publicKeyFromSeed, verifyLicense, decodePayloadUnsafe } from "../src/lib/licenseCore";
import { generateLicense, renewLicense, saveClient } from "../src/lib/generate";
import { evaluateGuard } from "../src/lib/safety";
import { hashPin, verifyPin, isValidPin, lockoutSeconds, newSalt } from "../src/lib/pin";
import { buildProjectList, plansFor } from "../src/lib/catalogView";
import { discardProblem, queueLegacy, retryProblem } from "../src/lib/sync";
import { uuid4 } from "../src/lib/ids";

async function setup() {
  const store = new MemoryStore();
  const repo = new Repo(store);
  const vault = new MemoryVault();
  const key = generateKeyPair();
  await vault.set("key:__default__", JSON.stringify({ kid: "vendor-master-ed25519", publicKey: key.publicKeyHex, privateKey: key.privateKeyHex }));
  await repo.setNum("last_sync_at", Date.now());
  await repo.setNum("max_seen_ms", Date.now());
  return { store, repo, vault, key };
}

(async () => {
  // uuid
  assert.match(uuid4(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

  // ---- clients ----
  {
    const { repo } = await setup();
    await assert.rejects(() => saveClient(repo, { clientName: "", phone: "03001234567" }), /name is required/);
    await assert.rejects(() => saveClient(repo, { clientName: "Ali", phone: "12" }), /phone/i);
    const a = await saveClient(repo, { clientName: " Ali ", businessName: "", phone: "0300-123 4567" });
    assert.equal(a.clientName, "Ali");
    assert.equal(a.businessName, "Ali");
    assert.equal(a.phone, "03001234567");
    assert.equal(a.syncState, "pending");
    assert.equal(a.revision, 1);
    await assert.rejects(() => saveClient(repo, { clientName: "Bob", phone: "03001234567" }), /already belongs/);
    const a2 = await saveClient(repo, { clientName: "Ali K", phone: "03001234567" }, a.id);
    assert.equal(a2.revision, 2);
    assert.equal(a2.id, a.id);
    assert.equal((await repo.clients("ali")).length, 1);
  }

  // ---- generate / renew (legacy RetailX project + own project) ----
  {
    const { repo, vault, key } = await setup();
    const deps = { repo, vault };
    const c = await saveClient(repo, { clientName: "Ali Store", phone: "03001234567" });
    const web = await generateLicense(deps, {
      clientId: c.id, projectCode: "retailx_360_web", planName: "standard", machineId: "ABCD-1234-HW", maxUsers: 5,
      features: { "pos.billing": true }, expiry: { days: 30 },
    });
    assert.equal(web.syncState, "pending");
    assert.equal(web.payload!.project_code, undefined); // RetailX payload stays untouched
    assert.equal(verifyLicense(web.license, { publicKeyHex: key.publicKeyHex, machineId: "abcd-1234-hw" }).ok, true);
    // same device + same project again is refused (renew instead)
    await assert.rejects(
      () => generateLicense(deps, { clientId: c.id, projectCode: "retailx_360_web", planName: "standard", machineId: "abcd-1234-hw", maxUsers: 1, features: {}, expiry: { days: 7 } }),
      /Renew/
    );
    // other project, hex20 id, bound to project_code
    const darzi = await generateLicense(deps, {
      clientId: c.id, projectCode: "darzihub", planName: "standard", machineId: "a1b2c-3d4e5-f6a7b-8c9d0", maxUsers: 1,
      features: { premium: true }, expiry: "lifetime",
    });
    assert.equal(darzi.machineId, "A1B2-C3D4-E5F6-A7B8-C9D0");
    assert.equal(darzi.payload!.project_code, "darzihub");
    assert.equal(darzi.isLifetime, true);
    await assert.rejects(() => generateLicense(deps, { clientId: c.id, projectCode: "darzihub", planName: "x", machineId: "bad", maxUsers: 1, features: {}, expiry: { days: 1 } }), /Device ID/);
    // no client
    await assert.rejects(() => generateLicense(deps, { clientId: "nope", projectCode: "darzihub", planName: "x", machineId: "A1B2-C3D4-E5F6-A7B8-C9D1", maxUsers: 1, features: {}, expiry: { days: 1 } }), /Choose a client/);

    // renew keeps id + license_id, bumps revision, longer expiry
    const r = await renewLicense(deps, darzi.id, { days: 90 });
    assert.equal(r.id, darzi.id);
    assert.equal(r.revision, 2);
    assert.equal(r.payload!.license_id, darzi.payload!.license_id);
    assert.equal(r.syncState, "pending");
    const r2 = await renewLicense(deps, web.id, { days: 90 });
    assert.ok(r2.expiryDate > web.expiryDate);
    assert.equal(verifyLicense(r2.license, { publicKeyHex: key.publicKeyHex, machineId: "ABCD-1234-HW" }).ok, true);

    // blocked on the Hub -> no renew
    await repo.store.putLicense({ ...web, status: "blocked" });
    await assert.rejects(() => renewLicense(deps, web.id, { days: 30 }), /block/);
    // legacy must be pushed first
    await repo.store.putLicense({ ...darzi, syncState: "legacy" });
    await assert.rejects(() => renewLicense(deps, darzi.id, { days: 30 }), /old record/);
    assert.equal(await queueLegacy(repo), 1);
    assert.equal((await repo.license(darzi.id))!.syncState, "pending");

    // problems: retry bumps revision, discard only for never-accepted
    await repo.store.putLicense({ ...(await repo.license(darzi.id))!, syncState: "rejected", syncMessage: "x" });
    assert.equal(await discardProblem(repo, "license", web.id), false); // pending/other state can't be thrown away
    await retryProblem(repo, "license", darzi.id);
    const rr = (await repo.license(darzi.id))!;
    assert.equal(rr.syncState, "pending");
    assert.equal(rr.revision, 2); // darzi was reset to rev 1 above, retry bumps it
    await repo.store.putLicense({ ...rr, syncState: "conflict" });
    assert.equal(await discardProblem(repo, "license", darzi.id), true);
    assert.equal(await repo.license(darzi.id), undefined);
  }

  // ---- generate is locked without sync / with clock rollback / when revoked ----
  {
    const { repo, vault } = await setup();
    const c = await saveClient(repo, { clientName: "Ali", phone: "03001234567" });
    const args = { clientId: c.id, projectCode: "darzihub", planName: "standard", machineId: "A1B2-C3D4-E5F6-A7B8-C9D0", maxUsers: 1, features: {}, expiry: { days: 30 } } as const;
    await repo.setNum("last_sync_at", Date.now());
    await repo.setNum("max_seen_ms", Date.now() + 3 * 86400000);
    await assert.rejects(() => generateLicense({ repo, vault }, { ...args }), /date\/time/);
    await repo.setNum("max_seen_ms", Date.now());
    await repo.store.kvSet("revoked_msg", "lost phone");
    await assert.rejects(() => generateLicense({ repo, vault }, { ...args }), /revoke/);
    await repo.store.kvDel("revoked_msg");
    assert.ok((await generateLicense({ repo, vault }, { ...args })).id);
  }
  assert.equal(evaluateGuard({ hasKeys: false, lastSyncAt: 0, maxSeenMs: 0, revokedMsg: "", nowMs: 1 }).ok, false);
  assert.equal(evaluateGuard({ hasKeys: true, lastSyncAt: 1000, maxSeenMs: 1000, revokedMsg: "", nowMs: 1000 + 400 * 86400000 }).ok, true); // a year offline is fine

  // ---- clock skew from the Hub is applied to the expiry date ----
  {
    const { repo, vault } = await setup();
    await repo.setNum("server_skew_ms", 2 * 86400000); // phone is 2 days behind the Hub
    const c = await saveClient(repo, { clientName: "Ali", phone: "03001234567" });
    const l = await generateLicense({ repo, vault }, { clientId: c.id, projectCode: "darzihub", planName: "s", machineId: "A1B2-C3D4-E5F6-A7B8-C9D0", maxUsers: 1, features: {}, expiry: { days: 10 } });
    const expect = new Date(Date.now() + 12 * 86400000).toISOString().slice(0, 10);
    assert.equal(l.expiryDate, expect);
  }

  // ---- PIN ----
  {
    const salt = newSalt();
    const h = hashPin("1234", salt);
    assert.ok(verifyPin("1234", salt, h));
    assert.ok(!verifyPin("1235", salt, h));
    assert.ok(isValidPin("1234") && isValidPin("12345678") && !isValidPin("123") && !isValidPin("12a4"));
    assert.equal(lockoutSeconds(4), 0);
    assert.equal(lockoutSeconds(5), 30);
    assert.equal(lockoutSeconds(7), 120);
    assert.equal(lockoutSeconds(50), 3600);
  }

  // ---- catalog view: Hub wins, built-ins fill gaps, Hub plans are used when present ----
  {
    const cat = {
      fetchedAt: 1, releases: [],
      projects: [{ id: "1", code: "retailx_360_web", name: "RetailX Web (Hub)", platform: "web_desktop", kid: "k", publicKey: "p", currentVersion: "9.9", defaultFeatures: { a: true } }],
      plans: [{ id: "p1", projectCode: "retailx_360_web", tierCode: "gold", name: "Gold", description: "", validityType: "days", validityDays: 365, isLifetime: false, maxUsers: 9, features: { x: true }, price: "" }],
    };
    const list = buildProjectList(cat as any);
    const web = list.find((p) => p.code === "retailx_360_web")!;
    assert.equal(web.name, "RetailX Web (Hub)");
    assert.equal(web.source, "hub");
    assert.equal(web.legacy, true); // keeps the RetailX payload format
    assert.equal(list.find((p) => p.code === "darzihub")!.source, "builtin");
    assert.deepEqual(plansFor(web, cat as any).map((p) => p.key), ["gold"]);
    assert.ok(plansFor(list.find((p) => p.code === "dpos_desktop")!, cat as any).length === 0);
  }

  // ---- HubClient: refresh on 401, revoked/network errors ----
  {
    const sess = new MemorySession();
    sess.s = { baseUrl: "https://hub.test", accessToken: "old", refreshToken: "ref", username: "admin", deviceId: "dev", deviceName: "p" };
    const calls: string[] = [];
    const fetchFn = async (url: string, init: any) => {
      calls.push(`${init.method} ${url.replace("https://hub.test", "")} ${init.headers.Authorization ?? ""}`);
      if (url.endsWith("/auth/refresh")) return { status: 200, ok: true, json: async () => ({ access_token: "new", refresh_token: "ref2" }) };
      if (url.endsWith("/bootstrap")) {
        return init.headers.Authorization === "Bearer new"
          ? { status: 200, ok: true, json: async () => ({ ok: 1 }) }
          : { status: 401, ok: false, json: async () => ({ detail: "expired" }) };
      }
      if (url.endsWith("/sync/pull?limit=200&offset=0")) return { status: 403, ok: false, json: async () => ({ detail: "Generator device 'x' has been remotely revoked: lost" }) };
      throw new TypeError("network down");
    };
    const hub = new HubClient(sess, { fetchFn });
    assert.deepEqual(await hub.bootstrap(), { ok: 1 });
    assert.equal(sess.s!.accessToken, "new");
    assert.equal(sess.s!.refreshToken, "ref2");
    await assert.rejects(() => hub.pull(null, 0), (e: any) => e.kind === "revoked");
    await assert.rejects(() => hub.push("dev", "b", []), (e: any) => e.kind === "network");
    await sess.clear();
    await assert.rejects(() => hub.bootstrap(), (e: any) => e.kind === "auth");
  }

  // keep nacl import used (PRNG sanity)
  assert.equal(nacl.randomBytes(4).length, 4);
  assert.ok(decodePayloadUnsafe("garbage") === null);
  assert.equal(publicKeyFromSeed(generateKeyPair().privateKeyHex).length, 64);
  console.log("core tests: all passed");
})().catch((e) => { console.error(e); process.exit(1); });
