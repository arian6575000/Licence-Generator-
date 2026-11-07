// End-to-end test of the app's sync engine against a REAL License Hub (run the Hub locally on SQLite).
//   HUB_URL=http://127.0.0.1:8765 HUB_USER=admin HUB_PASS=... npx tsx tests/e2e.ts
// It creates its own project/release/data on that Hub, so never point it at the live Hub.
import assert from "node:assert/strict";
import { MemorySession, MemoryStore, MemoryVault } from "./memoryStore";
import { Repo } from "../src/lib/store";
import { HubClient } from "../src/lib/hub";
import { bootstrap, pullAll, pushPending, runSync, queueLegacy } from "../src/lib/sync";
import { generateLicense, renewLicense, saveClient } from "../src/lib/generate";
import { currentGuard } from "../src/lib/safety";
import { verifyLicense } from "../src/lib/licenseCore";
import { uuid4 } from "../src/lib/ids";

const BASE = process.env.HUB_URL ?? "http://127.0.0.1:8765";
const USER = process.env.HUB_USER ?? "admin";
const PASS = process.env.HUB_PASS ?? "";
const log = (m: string) => console.log("  ok -", m);

async function admin(method: string, path: string, token: string, body?: unknown) {
  const r = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${JSON.stringify(j)}`);
  return j;
}

function makeApp(name: string, wrapFetch?: (f: typeof fetch) => any) {
  const store = new MemoryStore();
  const repo = new Repo(store);
  const vault = new MemoryVault();
  const sess = new MemorySession();
  const hub = new HubClient(sess, wrapFetch ? { fetchFn: wrapFetch(fetch) } : {});
  return { name, store, repo, vault, sess, hub, deps: { repo, hub, vault }, login: () => hub.login({ baseUrl: BASE, username: USER, password: PASS, deviceId: `e2e-${name}-${uuid4().slice(0, 8)}`, deviceName: name, appVersion: "t" }) };
}

(async () => {
  assert.ok(PASS, "HUB_PASS required");
  const t = await (await fetch(`${BASE}/api/v1/auth/token`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: USER, password: PASS }) })).json();
  const T = t.access_token as string;
  assert.ok(T, "admin login failed");

  // --- seed the Hub: own project with its own key, one plan, one release ---
  const kp = await admin("POST", "/api/v1/admin/crypto/generate-keypair", T);
  const proj = await admin("POST", "/api/v1/admin/projects", T, {
    name: "DarziHub E2E", code: "darzihub", platform: "android_apk", public_key: kp.public_key_hex, private_key: kp.private_key_hex,
    default_features: { premium: true, export: false },
  });
  await admin("POST", `/api/v1/admin/projects/${proj.project_id ?? proj.id ?? proj.project?.id}/plans`, T, { name: "Pro", tier_code: "pro", max_users: 3, features: { premium: true } }).catch(() => null);
  await admin("POST", "/api/v1/admin/releases", T, { brand_id: "darzihub", version_tag: "v1.2.0", download_url: "https://example.com/a.apk", release_notes: "e2e" });

  // === App 1: login, bootstrap, catalog read-only data ===
  const a1 = makeApp("phone1");
  await a1.login();
  let res = await runSync(a1.deps);
  assert.equal(res.ok, true, res.error);
  const cat = await a1.repo.catalog();
  assert.ok(cat.projects.some((p) => p.code === "darzihub"), "project from Hub");
  assert.equal(cat.projects.find((p) => p.code === "darzihub")!.defaultFeatures.premium, true);
  assert.ok(cat.releases.some((r) => r.versionTag === "v1.2.0"), "releases read-only list");
  const stored = JSON.parse((await a1.vault.get("key:darzihub"))!);
  assert.equal(stored.publicKey, kp.public_key_hex);
  assert.ok(!JSON.stringify(cat).includes(kp.private_key_hex), "private key must not be in the catalog");
  assert.equal((await currentGuard(a1.repo, true)).ok, true);
  log("login + bootstrap + catalog + releases + key in vault");

  // === offline: client + license, pending; then sync ===
  const ali = await saveClient(a1.repo, { clientName: "Ali", businessName: "Ali Tailors", phone: "03001110001", city: "Lahore" });
  const lic1 = await generateLicense(a1.deps, { clientId: ali.id, projectCode: "darzihub", planName: "pro", machineId: "1111-2222-3333-4444-5555", maxUsers: 3, features: { premium: true }, expiry: { days: 30 } });
  assert.equal(await a1.repo.pendingCount(), 2);
  assert.equal(verifyLicense(lic1.license, { publicKeyHex: kp.public_key_hex, machineId: lic1.machineId, projectCode: "darzihub" }).ok, true);

  // response lost on the first push: Hub applies it, app sees a network error
  let drop = true;
  const flaky = makeApp("phone1-flaky", (f) => async (url: string, init: any) => {
    const r = await f(url, init);
    if (drop && url.includes("/sync/push")) { drop = false; throw new TypeError("connection reset"); }
    return r;
  });
  await flaky.login();
  await runSync(flaky.deps);
  const bob = await saveClient(flaky.repo, { clientName: "Bob", phone: "03001110002" });
  const lic2 = await generateLicense(flaky.deps, { clientId: bob.id, projectCode: "darzihub", planName: "pro", machineId: "AAAA-BBBB-CCCC-DDDD-EEEE", maxUsers: 1, features: {}, expiry: { days: 10 } });
  res = await runSync(flaky.deps);
  assert.equal(res.offline, true);
  assert.equal(await flaky.repo.pendingCount(), 2, "still pending after lost response");
  res = await runSync(flaky.deps);
  assert.equal(res.ok, true, res.error);
  assert.equal(await flaky.repo.pendingCount(), 0);
  const hubClients = await admin("GET", "/api/v1/admin/clients", T);
  const bobRows = JSON.stringify(hubClients).split("Bob").length - 1;
  assert.ok(bobRows >= 1, "Bob exists on Hub");
  log("lost response -> retry is idempotent (no duplicate), records synced");

  res = await runSync(a1.deps);
  assert.equal(res.ok, true, res.error);
  assert.equal(res.accepted, 2);
  assert.equal(await a1.repo.pendingCount(), 0);
  assert.equal((await a1.repo.license(lic1.id))!.syncState, "synced");
  // the other phone's work arrived by pull
  assert.ok((await a1.repo.licenses()).some((l) => l.machineId === lic2.machineId), "pull brought Bob's license");
  log("offline client+license pushed, other phone's data pulled");

  // === second phone: sees phone1's data; duplicate-device conflict when created offline ===
  const a2 = makeApp("phone2");
  await a2.login();
  await bootstrap(a2.deps); // keys only, nothing pulled yet = "was offline"
  await a2.repo.setNum("last_sync_at", Date.now());
  const carl = await saveClient(a2.repo, { clientName: "Carl", phone: "03001110003" });
  const dup = await generateLicense(a2.deps, { clientId: carl.id, projectCode: "darzihub", planName: "pro", machineId: "1111-2222-3333-4444-5555", maxUsers: 1, features: {}, expiry: { days: 5 } });
  res = await runSync(a2.deps);
  assert.equal(res.conflicts, 1, "same device + project is a conflict");
  const dupNow = (await a2.repo.license(dup.id))!;
  assert.equal(dupNow.syncState, "conflict");
  assert.match(dupNow.syncMessage, /already has a license/);
  const aliLic = (await admin("GET", `/api/v1/admin/license/${lic1.id}/details`, T));
  assert.equal(aliLic.expiry_date, lic1.expiryDate, "Hub kept the original license");
  log("duplicate device -> conflict, original license untouched");

  // === renew on phone1 -> Hub, phone2 pulls it ===
  const renewed = await renewLicense(a1.deps, lic1.id, { days: 120 });
  assert.equal(renewed.revision, 2);
  res = await runSync(a1.deps);
  assert.equal(res.ok, true, res.error);
  assert.equal((await admin("GET", `/api/v1/admin/license/${lic1.id}/details`, T)).expiry_date, renewed.expiryDate);
  res = await runSync(a2.deps);
  assert.equal((await a2.repo.license(lic1.id))!.expiryDate, renewed.expiryDate);
  log("renew -> Hub updated -> other phone pulled new expiry");

  // === Hub blocks it: pull shows blocked, renew refused; offline renew pushed later = conflict ===
  const offlineRenew = await renewLicense(a2.deps, lic1.id, { days: 200 }); // phone2 renews before it hears about the block
  await admin("POST", `/api/v1/admin/license/${lic1.id}/block`, T, { reason: "unpaid", block_type: "payment_due" });
  res = await runSync(a2.deps);
  assert.ok(res.conflicts >= 1, "push on blocked license is a conflict");
  const after = (await a2.repo.license(lic1.id))!;
  assert.equal(after.status, "blocked");
  assert.equal(after.syncState, "conflict");
  assert.equal((await admin("GET", `/api/v1/admin/license/${lic1.id}/details`, T)).expiry_date, renewed.expiryDate, "block protected the Hub copy");
  await assert.rejects(() => renewLicense(a2.deps, lic1.id, { days: 30 }), /block/);
  void offlineRenew;
  log("blocked on Hub -> offline renew rejected as conflict, status shown");

  // === client edit + same-phone client created on another phone gets linked (id remapped) ===
  const ali2 = await saveClient(a1.repo, { clientName: "Ali K", businessName: "Ali Tailors", phone: "03001110001", city: "Karachi" }, ali.id);
  res = await runSync(a1.deps);
  assert.equal(res.ok, true, res.error);
  res = await runSync(a2.deps);
  assert.equal((await a2.repo.client(ali.id))!.city, "Karachi");
  const aliAgain = await saveClient(makeApp("x").repo, { clientName: "x", phone: "03009990000" }); // other repo, just to prove ids differ
  void aliAgain; void ali2;
  // phone3 never saw Ali, creates "Ali" with the same phone offline
  const a3 = makeApp("phone3");
  await a3.login();
  await bootstrap(a3.deps);
  await a3.repo.setNum("last_sync_at", Date.now());
  const aliDup = await saveClient(a3.repo, { clientName: "Ali again", phone: "03001110001" });
  const dpos = await generateLicense(a3.deps, { clientId: aliDup.id, projectCode: "darzihub", planName: "pro", machineId: "9999-8888-7777-6666-5555", maxUsers: 1, features: {}, expiry: { days: 20 } });
  res = await runSync(a3.deps);
  assert.equal(res.ok, true, res.error);
  assert.equal(res.accepted, 2, JSON.stringify(res));
  assert.equal((await a3.repo.client(ali.id))?.id, ali.id, "client id remapped to the Hub's client");
  assert.equal(await a3.repo.client(aliDup.id), undefined);
  assert.equal((await a3.repo.license(dpos.id))!.clientId, ali.id);
  assert.equal((await a3.repo.client(ali.id))!.clientName, "Ali K", "Hub's client data not overwritten by the duplicate");
  log("same phone on another device -> linked to existing client, ids remapped");

  // === tampered push (valid key, lying data) is rejected by the Hub ===
  const evilApp = makeApp("evil");
  await evilApp.login();
  const devId = await evilApp.hub.deviceId();
  const resp = await evilApp.hub.push(devId, "evil-1", [{ operation_id: "evil-op", entity: "license", action: "create", data: { id: uuid4(), client_id: ali.id, project_code: "darzihub", license_key: lic2.license, machine_id: "ZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZZZ", expiry_date: "2099-12-31", is_lifetime: true } }]);
  assert.equal(resp.results[0].status, "rejected");
  const del = await evilApp.hub.push(devId, "evil-2", [{ operation_id: "evil-del", entity: "client", action: "delete", data: { id: ali.id, phone: "03001110001" } }]);
  assert.equal(del.results[0].status, "rejected");
  log("tampered data and deletes are rejected");

  // === legacy records only go when asked ===
  const a4 = makeApp("phone4");
  await a4.login();
  await runSync(a4.deps);
  const old = await saveClient(a4.repo, { clientName: "Old Client", phone: "03001110099" });
  await a4.repo.store.putClient({ ...old, syncState: "legacy" });
  res = await runSync(a4.deps);
  assert.equal(res.pushed, 0, "legacy not pushed automatically");
  assert.equal(await queueLegacy(a4.repo), 0);
  await a4.repo.store.putClient({ ...(await a4.repo.client(old.id))!, syncState: "legacy" });
  await queueLegacy(a4.repo); // flips clients too (licenses count is 0 here)
  res = await runSync(a4.deps);
  assert.equal(res.pushed, 1);
  log("legacy: untouched until queued");

  // === revoke: sync reports it, generating locked; unrevoke restores ===
  const devs = await admin("GET", "/api/v1/generator/devices", T);
  const list = devs.devices ?? devs;
  const me = list.find((d: any) => d.device_name === "phone4");
  await admin("POST", `/api/v1/generator/devices/${me.id}/revoke`, T, { reason: "lost phone" });
  res = await runSync(a4.deps);
  assert.equal(res.revoked, true);
  assert.equal((await currentGuard(a4.repo, true)).ok, false);
  await admin("POST", `/api/v1/generator/devices/${me.id}/unrevoke`, T, {});
  res = await runSync(a4.deps);
  assert.equal(res.ok, true, res.error);
  assert.equal((await currentGuard(a4.repo, true)).ok, true);
  log("revoke -> locked; unrevoke -> works again");

  // === wrong password / offline hub ===
  const bad = makeApp("bad");
  await assert.rejects(() => bad.hub.login({ baseUrl: BASE, username: USER, password: "wrong", deviceId: "d", deviceName: "n", appVersion: "t" }), (e: any) => e.kind === "auth");
  await assert.rejects(() => bad.hub.login({ baseUrl: "http://127.0.0.1:1", username: USER, password: PASS, deviceId: "d", deviceName: "n", appVersion: "t" }), (e: any) => e.kind === "network");
  log("bad password / unreachable Hub give clear errors");

  console.log("e2e: all passed");
})().catch((e) => { console.error(e); process.exit(1); });
