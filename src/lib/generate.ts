// Creating, renewing clients and licenses. Everything works offline; records are marked "pending"
// and the sync engine sends them to the Hub later.
import { buildPayload, isoDate, normalizeDeviceId, publicKeyFromSeed, signLicense, verifyLicense } from "./licenseCore";
import type { FeatureMap } from "./catalog";
import { buildProjectList, ProjectView } from "./catalogView";
import { uuid4 } from "./ids";
import { currentGuard, noteClock, trustedNow } from "./safety";
import type { KeyVault, Repo } from "./store";
import type { ClientRec, LicenseRec, StoredKey } from "./types";

export type Deps = { repo: Repo; vault: KeyVault };

const clean = (s?: string) => (s ?? "").trim();

// ---------------- clients ----------------
export type ClientInput = {
  clientName: string;
  businessName?: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  city?: string;
  address?: string;
  notes?: string;
};

export function normalizePhone(p: string) {
  return p.replace(/[\s\-()]/g, "");
}

function validateClient(i: ClientInput) {
  if (!clean(i.clientName)) throw new Error("Client ka naam likhna zaroori hai");
  const ph = normalizePhone(clean(i.phone));
  if (!/^\+?\d{7,15}$/.test(ph)) throw new Error("Phone number sahi likhein (7 se 15 digits)");
  if (clean(i.email) && !/^\S+@\S+\.\S+$/.test(clean(i.email))) throw new Error("Email sahi nahi hai");
  return ph;
}

export async function saveClient(repo: Repo, input: ClientInput, existingId?: string, nowMs = Date.now()): Promise<ClientRec> {
  const phone = validateClient(input);
  const all = await repo.clients("", true);
  const dup = all.find((c) => c.id !== existingId && normalizePhone(c.phone) === phone && c.status !== "deleted");
  if (dup) throw new Error(`Yeh phone pehle se "${dup.clientName}" ke naam par hai`);
  const prev = existingId ? all.find((c) => c.id === existingId) : undefined;
  if (existingId && !prev) throw new Error("Client nahi mila");
  const rec: ClientRec = {
    id: prev?.id ?? uuid4(),
    clientName: clean(input.clientName),
    businessName: clean(input.businessName) || clean(input.clientName),
    phone,
    whatsapp: clean(input.whatsapp) || phone,
    email: clean(input.email),
    city: clean(input.city),
    address: clean(input.address),
    notes: clean(input.notes),
    status: prev?.status ?? "active",
    revision: (prev?.revision ?? 0) + 1,
    createdAt: prev?.createdAt ?? nowMs,
    updatedAt: nowMs,
    syncState: "pending",
    syncMessage: "",
  };
  await repo.store.putClient(rec);
  return rec;
}

// ---------------- licenses ----------------
async function findKey(vault: KeyVault, projectCode: string): Promise<StoredKey> {
  const raw = (await vault.get(`key:${projectCode}`)) ?? (await vault.get("key:__default__"));
  if (!raw) throw new Error("Signing key nahi mili. Internet par Hub se sync karein");
  const k = JSON.parse(raw) as StoredKey;
  if (!k.privateKey) throw new Error("Signing key kharab hai, dobara sync karein");
  return k;
}

export type ExpiryChoice = { days: number } | { date: string } | "lifetime";

export type GenerateArgs = {
  clientId: string;
  projectCode: string;
  planName: string;
  machineId: string;
  maxUsers: number;
  features: FeatureMap;
  expiry: ExpiryChoice;
};

async function requireGuard(deps: Deps) {
  const keys = !!(await deps.vault.get("key:__default__"));
  const g = await currentGuard(deps.repo, keys);
  if (!g.ok) throw new Error(g.reason);
}

export const sameDevice = (a: string, b: string) => a.trim().toUpperCase() === b.trim().toUpperCase();

export async function generateLicense(deps: Deps, a: GenerateArgs, realNow = Date.now()): Promise<LicenseRec> {
  await requireGuard(deps);
  const { repo, vault } = deps;
  const client = await repo.client(a.clientId);
  if (!client || client.status === "deleted") throw new Error("Pehle client chunein");
  const cat = await repo.catalog();
  const project = buildProjectList(cat).find((p: ProjectView) => p.code === a.projectCode);
  if (!project) throw new Error("Project chunein");

  const now = new Date(await trustedNow(repo, realNow));
  const payload = buildPayload({
    machineId: a.machineId,
    clientName: client.clientName,
    planName: a.planName || project.planName,
    maxUsers: a.maxUsers,
    features: a.features,
    expiry: a.expiry,
    idFormat: project.idFormat,
    project: { code: project.code, legacy: project.legacy },
    now,
  });

  // one live license per device per project (Hub enforces the same)
  const existing = (await repo.licenses({ projectCode: project.code })).find(
    (l) => sameDevice(l.machineId, payload.machine_id) && l.status !== "blocked" && (l.isLifetime || l.expiryDate >= isoDate(now))
  );
  if (existing) throw new Error(`Is device par ${project.name} ka license pehle se chal raha hai (#${existing.id.slice(0, 8)}). Naya banane ke bajaye Renew use karein`);

  const key = await findKey(vault, project.code);
  const license = signLicense(payload, key.privateKey);
  const check = verifyLicense(license, { publicKeyHex: publicKeyFromSeed(key.privateKey), machineId: payload.machine_id, now: now.getTime() });
  if (!check.ok) throw new Error("Bani hui license khud verify nahi hui, dobara sync karke try karein");

  const rec: LicenseRec = {
    id: uuid4(),
    clientId: client.id,
    projectCode: project.code,
    projectName: project.name,
    machineId: payload.machine_id,
    planName: payload.plan_name,
    maxUsers: payload.max_users,
    issuedAt: Math.floor(now.getTime() / 1000),
    expiryDate: payload.expiry_date,
    isLifetime: payload.is_lifetime,
    license,
    payload,
    features: payload.features,
    status: "active",
    blockReason: "",
    revision: 1,
    kid: key.kid,
    origin: "generator",
    updatedAt: now.getTime(),
    syncState: "pending",
    syncMessage: "",
  };
  await repo.store.putLicense(rec);
  await noteClock(repo, realNow);
  return rec;
}

// Renewal = a new signed key for the same device/client/plan with a new expiry. Same license id, revision + 1.
export async function renewLicense(deps: Deps, licenseId: string, expiry: ExpiryChoice, realNow = Date.now()): Promise<LicenseRec> {
  await requireGuard(deps);
  const { repo, vault } = deps;
  const old = await repo.license(licenseId);
  if (!old) throw new Error("License nahi mili");
  if (old.status === "blocked" || old.status === "suspended") throw new Error("Yeh license Hub par block hai. Pehle Hub se unblock karwayen");
  if (!old.payload) throw new Error("Is license ka data parha nahi ja raha");
  if (old.syncState === "legacy") throw new Error("Purana record pehle Hub par bhejein (Settings), phir renew karein");
  const cat = await repo.catalog();
  const project = buildProjectList(cat).find((p) => p.code === old.projectCode);

  const now = new Date(await trustedNow(repo, realNow));
  const payload = buildPayload({
    machineId: old.machineId,
    clientName: old.payload.client_name,
    planName: old.payload.plan_name,
    maxUsers: old.payload.max_users,
    features: old.payload.features,
    expiry,
    idFormat: "any",
    project: old.payload.project_code ? { code: old.payload.project_code, legacy: false } : undefined,
    licenseId: old.payload.license_id,
    now,
  });
  const key = await findKey(vault, old.projectCode);
  const license = signLicense(payload, key.privateKey);
  const check = verifyLicense(license, { publicKeyHex: publicKeyFromSeed(key.privateKey), machineId: payload.machine_id, now: now.getTime() });
  if (!check.ok) throw new Error("Bani hui license khud verify nahi hui, dobara sync karke try karein");

  const rec: LicenseRec = {
    ...old,
    projectName: project?.name ?? old.projectName,
    issuedAt: Math.floor(now.getTime() / 1000),
    expiryDate: payload.expiry_date,
    isLifetime: payload.is_lifetime,
    license,
    payload,
    features: payload.features,
    kid: key.kid,
    revision: old.revision + 1,
    updatedAt: now.getTime(),
    syncState: "pending",
    syncMessage: "",
  };
  await repo.store.putLicense(rec);
  await noteClock(repo, realNow);
  return rec;
}

export { normalizeDeviceId };
