// Storage contracts. The app uses SQLite (src/native/sqliteStore.ts); tests use an in-memory store.
import type { Catalog, ClientRec, LicenseRec } from "./types";

export interface Store {
  init(): Promise<void>;
  kvGet(k: string): Promise<string | null>;
  kvSet(k: string, v: string): Promise<void>;
  kvDel(k: string): Promise<void>;
  allClients(): Promise<ClientRec[]>;
  putClient(c: ClientRec): Promise<void>;
  delClient(id: string): Promise<void>;
  allLicenses(): Promise<LicenseRec[]>;
  putLicense(l: LicenseRec): Promise<void>;
  delLicense(id: string): Promise<void>;
}

// Secrets (signing keys). Android Keystore-backed in the app.
export interface KeyVault {
  get(name: string): Promise<string | null>;
  set(name: string, value: string): Promise<void>;
  del(name: string): Promise<void>;
}

const EMPTY_CATALOG: Catalog = { projects: [], plans: [], releases: [], fetchedAt: 0 };

export class Repo {
  constructor(public store: Store) {}

  async getJSON<T>(k: string, fallback: T): Promise<T> {
    try {
      const s = await this.store.kvGet(k);
      return s ? (JSON.parse(s) as T) : fallback;
    } catch {
      return fallback;
    }
  }
  setJSON(k: string, v: unknown) {
    return this.store.kvSet(k, JSON.stringify(v));
  }
  async getNum(k: string): Promise<number> {
    const s = await this.store.kvGet(k);
    const n = s ? Number(s) : 0;
    return Number.isFinite(n) ? n : 0;
  }
  setNum(k: string, n: number) {
    return this.store.kvSet(k, String(n));
  }

  async catalog(): Promise<Catalog> {
    return this.getJSON<Catalog>("catalog", EMPTY_CATALOG);
  }
  saveCatalog(c: Catalog) {
    return this.setJSON("catalog", c);
  }

  async clients(search = "", includeDeleted = false): Promise<ClientRec[]> {
    const q = search.trim().toLowerCase();
    const all = await this.store.allClients();
    return all
      .filter((c) => includeDeleted || c.status !== "deleted")
      .filter((c) => !q || [c.clientName, c.businessName, c.phone, c.city].some((v) => (v || "").toLowerCase().includes(q)))
      .sort((a, b) => a.clientName.localeCompare(b.clientName));
  }
  async client(id: string): Promise<ClientRec | undefined> {
    return (await this.store.allClients()).find((c) => c.id === id);
  }

  async licenses(opts: { search?: string; projectCode?: string; clientId?: string } = {}): Promise<LicenseRec[]> {
    const q = (opts.search ?? "").trim().toLowerCase();
    const clients = q ? new Map((await this.store.allClients()).map((c) => [c.id, c])) : null;
    const all = await this.store.allLicenses();
    return all
      .filter((l) => !opts.projectCode || l.projectCode === opts.projectCode)
      .filter((l) => !opts.clientId || l.clientId === opts.clientId)
      .filter((l) => {
        if (!q) return true;
        const c = clients!.get(l.clientId);
        return [l.machineId, l.id, l.projectName, c?.clientName, c?.businessName, c?.phone].some((v) => (v || "").toLowerCase().includes(q));
      })
      .sort((a, b) => b.issuedAt - a.issuedAt);
  }
  async license(id: string): Promise<LicenseRec | undefined> {
    return (await this.store.allLicenses()).find((l) => l.id === id);
  }

  async pendingCount(): Promise<number> {
    const [c, l] = await Promise.all([this.store.allClients(), this.store.allLicenses()]);
    return c.filter((x) => x.syncState === "pending").length + l.filter((x) => x.syncState === "pending").length;
  }
  async problemCount(): Promise<number> {
    const [c, l] = await Promise.all([this.store.allClients(), this.store.allLicenses()]);
    const bad = (s: string) => s === "rejected" || s === "conflict";
    return c.filter((x) => bad(x.syncState)).length + l.filter((x) => bad(x.syncState)).length;
  }
  async legacyCount(): Promise<number> {
    return (await this.store.allLicenses()).filter((x) => x.syncState === "legacy").length;
  }
}
