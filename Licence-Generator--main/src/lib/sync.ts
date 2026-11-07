// Sync engine: bootstrap (keys + read-only catalog), push (pending clients/licenses), pull (server changes).
// State-based: a record with syncState "pending" is sent; its operation id is `<entity>:<id>:r<revision>`,
// so a retry after a lost response is recognised by the Hub as a duplicate and never applied twice.
import { decodePayloadUnsafe } from "./licenseCore";
import { HubClient, HubError, PushOp, PushResult } from "./hub";
import { projectName } from "./catalogView";
import type { KeyVault, Repo } from "./store";
import type { Catalog, ClientRec, HubPlan, HubProject, HubRelease, LicenseRec, SyncState } from "./types";

export type SyncDeps = { repo: Repo; hub: HubClient; vault: KeyVault };

export type SyncResult = {
  ok: boolean;
  offline: boolean;
  auth: boolean; // login needed again
  revoked: boolean;
  error: string;
  pushed: number;
  accepted: number;
  rejected: number;
  conflicts: number;
  pulledClients: number;
  pulledLicenses: number;
};

const blank = (): SyncResult => ({
  ok: false, offline: false, auth: false, revoked: false, error: "",
  pushed: 0, accepted: 0, rejected: 0, conflicts: 0, pulledClients: 0, pulledLicenses: 0,
});

const s = (v: any) => (v === null || v === undefined ? "" : String(v));
const BATCH = 200;

// ---------------- bootstrap ----------------
export async function bootstrap(deps: SyncDeps, realNow = Date.now()) {
  const { repo, hub, vault } = deps;
  const r = await hub.bootstrap();

  const projects: HubProject[] = (r.projects ?? []).map((p: any) => ({
    id: s(p.id), code: s(p.code), name: s(p.name), platform: s(p.platform), kid: s(p.kid),
    publicKey: s(p.public_key), currentVersion: s(p.current_version), defaultFeatures: p.default_features ?? {},
  }));
  const plans: HubPlan[] = (r.plans ?? []).map((p: any) => ({
    id: s(p.id), projectCode: s(p.project_code), tierCode: s(p.tier_code), name: s(p.name), description: s(p.description),
    validityType: s(p.validity_type), validityDays: Number(p.validity_days) || 0, isLifetime: !!p.is_lifetime,
    maxUsers: Number(p.max_users) || 1, features: p.features ?? {}, price: s(p.price),
  }));

  // keys go to the secure vault only
  const codes: string[] = [];
  for (const p of r.projects ?? []) {
    if (!p.code || !p.private_key) continue;
    await vault.set(`key:${p.code}`, JSON.stringify({ kid: p.kid, publicKey: p.public_key, privateKey: p.private_key }));
    codes.push(p.code);
  }
  const d = r.default_signing_key;
  if (d?.private_key) await vault.set("key:__default__", JSON.stringify({ kid: d.kid, publicKey: d.public_key, privateKey: d.private_key }));
  const old = await repo.getJSON<string[]>("key_codes", []);
  for (const c of old) if (!codes.includes(c)) await vault.del(`key:${c}`);
  await repo.setJSON("key_codes", codes);

  const prev = await repo.catalog();
  await repo.saveCatalog({ ...prev, projects, plans, fetchedAt: realNow });
  await noteServerTime(repo, r.server_time, realNow);
  await repo.store.kvDel("revoked_msg");
}

async function noteServerTime(repo: Repo, serverTime: string | undefined, realNow: number) {
  const t = serverTime ? Date.parse(serverTime) : NaN;
  if (Number.isFinite(t)) {
    await repo.setNum("server_skew_ms", t - realNow);
    await repo.setNum("max_seen_ms", Math.max(t, realNow));
  }
}

// ---------------- push ----------------
const opId = (entity: string, id: string, rev: number) => `${entity}:${id}:r${rev}`;

function clientOp(c: ClientRec): PushOp {
  return {
    operation_id: opId("client", c.id, c.revision),
    entity: "client",
    action: c.revision <= 1 ? "create" : "update",
    client_timestamp: new Date(c.updatedAt).toISOString(),
    data: {
      id: c.id, client_name: c.clientName, business_name: c.businessName, phone: c.phone, whatsapp: c.whatsapp,
      email: c.email || null, city: c.city || null, address: c.address || null, notes: c.notes || null, revision: c.revision,
    },
  };
}

function licenseOp(l: LicenseRec, phone: string): PushOp {
  return {
    operation_id: opId("license", l.id, l.revision),
    entity: "license",
    action: l.revision <= 1 ? "create" : "update",
    client_timestamp: new Date(l.updatedAt).toISOString(),
    data: {
      id: l.id, client_id: l.clientId, client_phone: phone, project_code: l.projectCode, license_key: l.license,
      machine_id: l.machineId, expiry_date: l.expiryDate, is_lifetime: l.isLifetime, plan_tier: l.planName,
      max_users: l.maxUsers, allowed_features: l.features, kid: l.kid, revision: l.revision,
    },
  };
}

function stateFrom(r: PushResult): { state: SyncState; msg: string } {
  let st = r.status;
  if (st === "duplicate") {
    const m = /result '(\w+)'/.exec(r.message ?? "");
    st = m ? m[1] : "accepted";
  }
  if (st === "accepted") return { state: "synced", msg: "" };
  if (st === "conflict") return { state: "conflict", msg: r.message ?? "Conflict" };
  return { state: "rejected", msg: r.message ?? "The Hub did not accept this record" };
}

async function remapClient(repo: Repo, oldId: string, newId: string) {
  const c = await repo.client(oldId);
  if (c && oldId !== newId) {
    await repo.store.delClient(oldId);
    await repo.store.putClient({ ...c, id: newId });
  }
  for (const l of await repo.store.allLicenses()) if (l.clientId === oldId) await repo.store.putLicense({ ...l, clientId: newId });
}

async function remapLicense(repo: Repo, oldId: string, newId: string) {
  const l = await repo.license(oldId);
  if (l && oldId !== newId) {
    await repo.store.delLicense(oldId);
    await repo.store.putLicense({ ...l, id: newId });
  }
}

export async function pushPending(deps: SyncDeps, res: SyncResult) {
  const { repo, hub } = deps;
  const clients = (await repo.store.allClients()).filter((c) => c.syncState === "pending").sort((a, b) => a.updatedAt - b.updatedAt);
  const allClients = await repo.store.allClients();
  const byId = new Map(allClients.map((c) => [c.id, c]));
  // a license waits while its client is stuck (rejected/conflict/legacy)
  const licenses = (await repo.store.allLicenses())
    .filter((l) => l.syncState === "pending")
    .filter((l) => {
      const c = byId.get(l.clientId);
      return !!c && (c.syncState === "pending" || c.syncState === "synced");
    })
    .sort((a, b) => a.updatedAt - b.updatedAt);

  const ops: { op: PushOp; entity: "client" | "license"; id: string; revision: number }[] = [
    ...clients.map((c) => ({ op: clientOp(c), entity: "client" as const, id: c.id, revision: c.revision })),
    ...licenses.map((l) => ({ op: licenseOp(l, byId.get(l.clientId)!.phone), entity: "license" as const, id: l.id, revision: l.revision })),
  ];
  if (!ops.length) return;

  const deviceId = await hub.deviceId();
  for (let i = 0; i < ops.length; i += BATCH) {
    const chunk = ops.slice(i, i + BATCH);
    const batchId = `b-${Date.now().toString(36)}-${i}`;
    const resp = await hub.push(deviceId, batchId, chunk.map((x) => x.op));
    const byOp = new Map(resp.results.map((r) => [r.operation_id, r]));
    for (const x of chunk) {
      res.pushed++;
      const r = byOp.get(x.op.operation_id);
      if (!r) continue;
      const { state, msg } = stateFrom(r);
      if (state === "synced") res.accepted++;
      else if (state === "conflict") res.conflicts++;
      else res.rejected++;

      if (x.entity === "client") {
        const cur = await repo.client(x.id);
        if (!cur || cur.revision !== x.revision) continue; // edited while syncing, will go in the next round
        await repo.store.putClient({ ...cur, syncState: state, syncMessage: msg });
        if (state === "synced" && r.entity_id && r.entity_id !== x.id) await remapClient(repo, x.id, r.entity_id);
      } else {
        const cur = await repo.license(x.id);
        if (!cur || cur.revision !== x.revision) continue;
        await repo.store.putLicense({ ...cur, syncState: state, syncMessage: msg });
        if (state === "synced" && r.entity_id && r.entity_id !== x.id) await remapLicense(repo, x.id, r.entity_id);
      }
    }
  }
}

// ---------------- pull ----------------
function serverClient(c: any, prev?: ClientRec): ClientRec {
  return {
    id: s(c.id), clientName: s(c.client_name), businessName: s(c.business_name) || s(c.client_name), phone: s(c.phone),
    whatsapp: s(c.whatsapp), email: s(c.email), city: s(c.city), address: s(c.address), notes: s(c.notes),
    status: c.is_deleted ? "deleted" : s(c.status) || "active", revision: Number(c.revision) || 1,
    createdAt: prev?.createdAt ?? (Date.parse(s(c.updated_at)) || Date.now()),
    updatedAt: Date.parse(s(c.updated_at) + (/[zZ]|[+-]\d\d:\d\d$/.test(s(c.updated_at)) ? "" : "Z")) || Date.now(),
    syncState: "synced", syncMessage: "",
  };
}

function serverLicense(l: any, cat: Catalog): LicenseRec {
  const key = s(l.license_key);
  const payload = decodePayloadUnsafe(key);
  const created = payload?.created_at ? Date.parse(payload.created_at.slice(0, 19) + "Z") : NaN;
  const code = s(l.project_code) || "retailx_360_web";
  return {
    id: s(l.id), clientId: s(l.client_id), projectCode: code, projectName: projectName(code, cat),
    machineId: s(l.machine_id), planName: s(l.plan_tier) || payload?.plan_name || "", maxUsers: Number(l.max_users) || 1,
    issuedAt: Math.floor((Number.isFinite(created) ? created : Date.parse(s(l.updated_at) + "Z") || Date.now()) / 1000),
    expiryDate: s(l.expiry_date).slice(0, 10), isLifetime: !!l.is_lifetime, license: key, payload,
    features: l.allowed_features ?? payload?.features ?? {}, status: s(l.status) || "active", blockReason: s(l.block_reason),
    revision: Number(l.revision) || 1, kid: s(l.kid), origin: "server",
    updatedAt: Date.parse(s(l.updated_at) + "Z") || Date.now(), syncState: "synced", syncMessage: "",
  };
}

export async function pullAll(deps: SyncDeps, res: SyncResult, realNow = Date.now()) {
  const { repo, hub } = deps;
  const since = (await repo.store.kvGet("pull_cursor")) || null;
  let offset = 0;
  let firstServerTime = "";
  let sawReleases: any[] | null = null;

  for (let page = 0; page < 500; page++) {
    const r = await hub.pull(since, offset, 200);
    if (!firstServerTime) {
      firstServerTime = s(r.server_time);
      await noteServerTime(repo, firstServerTime, realNow);
    }
    const cat = await repo.catalog();

    const localClients = new Map((await repo.store.allClients()).map((c) => [c.id, c]));
    for (const c of r.clients ?? []) {
      const local = localClients.get(s(c.id));
      if (local && local.syncState !== "synced") continue; // local work in progress wins until pushed
      await repo.store.putClient(serverClient(c, local));
      res.pulledClients++;
    }

    const localLics = new Map((await repo.store.allLicenses()).map((l) => [l.id, l]));
    for (const l of r.licenses ?? []) {
      const local = localLics.get(s(l.id));
      if (l.is_deleted) {
        if (local && local.syncState === "synced") await repo.store.delLicense(local.id);
        continue;
      }
      if (local && local.syncState !== "synced") {
        // keep my unsent key/expiry, but the Hub decides block/unblock
        await repo.store.putLicense({ ...local, status: s(l.status) || local.status, blockReason: s(l.block_reason) });
        continue;
      }
      await repo.store.putLicense(serverLicense(l, cat));
      res.pulledLicenses++;
    }
    if (Array.isArray(r.releases)) sawReleases = r.releases;
    if (!r.has_more || r.next_offset === null || r.next_offset === undefined) break;
    offset = r.next_offset;
  }

  if (firstServerTime) await repo.store.kvSet("pull_cursor", firstServerTime);
  await refreshReleases(deps, sawReleases);
}

const toRelease = (r: any): HubRelease => ({
  id: s(r.id), brandId: s(r.brand_id), versionTag: s(r.version_tag), downloadUrl: s(r.download_url), sha256: s(r.sha256_hash),
  fileSizeMb: Number(r.file_size_mb) || 0, releaseNotes: s(r.release_notes), isActive: r.is_active !== false, createdAt: s(r.created_at),
});

async function refreshReleases(deps: SyncDeps, fromPull: any[] | null) {
  let list = fromPull;
  if (!list) {
    try {
      list = await deps.hub.releases(); // older Hub: read-only admin endpoint
    } catch {
      return; // releases are a nice-to-have
    }
  }
  const cat = await deps.repo.catalog();
  await deps.repo.saveCatalog({ ...cat, releases: list.map(toRelease) });
}

// ---------------- full run ----------------
export async function runSync(deps: SyncDeps, realNow = Date.now()): Promise<SyncResult> {
  const res = blank();
  try {
    await bootstrap(deps, realNow);
    await pushPending(deps, res);
    await pullAll(deps, res, realNow);
    await deps.repo.setNum("last_sync_at", Date.now());
    res.ok = true;
  } catch (e: any) {
    if (e instanceof HubError) {
      if (e.kind === "network") res.offline = true;
      else if (e.kind === "auth") res.auth = true;
      else if (e.kind === "revoked") {
        res.revoked = true;
        await deps.repo.store.kvSet("revoked_msg", e.detail.replace(/^.*revoked:\s*/i, "") || "Revoked");
      }
      res.error = e.detail;
    } else {
      res.error = e?.message ?? String(e);
    }
  }
  return res;
}

// ---------------- helpers for the screens ----------------
export async function queueLegacy(repo: Repo): Promise<number> {
  let n = 0;
  const clients = await repo.store.allClients();
  for (const c of clients) if (c.syncState === "legacy") await repo.store.putClient({ ...c, syncState: "pending" });
  for (const l of await repo.store.allLicenses()) {
    if (l.syncState === "legacy") {
      await repo.store.putLicense({ ...l, syncState: "pending" });
      n++;
    }
  }
  return n;
}

export async function retryProblem(repo: Repo, entity: "client" | "license", id: string) {
  if (entity === "client") {
    const c = await repo.client(id);
    if (c) await repo.store.putClient({ ...c, revision: c.revision + 1, syncState: "pending", syncMessage: "" });
  } else {
    const l = await repo.license(id);
    if (l) await repo.store.putLicense({ ...l, revision: l.revision + 1, syncState: "pending", syncMessage: "" });
  }
}

// Only things the Hub never accepted can be thrown away locally.
export async function discardProblem(repo: Repo, entity: "client" | "license", id: string): Promise<boolean> {
  if (entity === "license") {
    const l = await repo.license(id);
    if (!l || !["rejected", "conflict", "legacy"].includes(l.syncState)) return false;
    await repo.store.delLicense(id);
    return true;
  }
  const c = await repo.client(id);
  if (!c || !["rejected", "conflict", "legacy"].includes(c.syncState)) return false;
  if ((await repo.licenses({ clientId: id })).length) return false;
  await repo.store.delClient(id);
  return true;
}
