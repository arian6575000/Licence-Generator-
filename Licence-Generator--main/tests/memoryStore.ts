// In-memory Store / KeyVault / SessionStorage used by the tests (the app uses SQLite + SecureStore).
import type { Store, KeyVault } from "../src/lib/store";
import type { Session, SessionStorage } from "../src/lib/hub";
import type { ClientRec, LicenseRec } from "../src/lib/types";

export class MemoryStore implements Store {
  kv = new Map<string, string>();
  clients = new Map<string, ClientRec>();
  licenses = new Map<string, LicenseRec>();
  async init() {}
  async kvGet(k: string) { return this.kv.get(k) ?? null; }
  async kvSet(k: string, v: string) { this.kv.set(k, v); }
  async kvDel(k: string) { this.kv.delete(k); }
  async allClients() { return [...this.clients.values()].map((c) => ({ ...c })); }
  async putClient(c: ClientRec) { this.clients.set(c.id, { ...c }); }
  async delClient(id: string) { this.clients.delete(id); }
  async allLicenses() { return [...this.licenses.values()].map((l) => ({ ...l })); }
  async putLicense(l: LicenseRec) { this.licenses.set(l.id, { ...l }); }
  async delLicense(id: string) { this.licenses.delete(id); }
}

export class MemoryVault implements KeyVault {
  m = new Map<string, string>();
  async get(n: string) { return this.m.get(n) ?? null; }
  async set(n: string, v: string) { this.m.set(n, v); }
  async del(n: string) { this.m.delete(n); }
}

export class MemorySession implements SessionStorage {
  s: Session | null = null;
  async load() { return this.s ? { ...this.s } : null; }
  async save(s: Session) { this.s = { ...s }; }
  async clear() { this.s = null; }
}
