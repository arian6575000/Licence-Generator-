// SQLite implementation of Store, plus one-time migration of the old offline-only history (licenses_v2).
import * as SQLite from "expo-sqlite";
import type { Store } from "../lib/store";
import type { ClientRec, LicenseRec } from "../lib/types";
import { decodePayloadUnsafe } from "../lib/licenseCore";
import { uuid4 } from "../lib/ids";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY, client_name TEXT NOT NULL, business_name TEXT NOT NULL, phone TEXT NOT NULL,
  whatsapp TEXT, email TEXT, city TEXT, address TEXT, notes TEXT, status TEXT NOT NULL,
  revision INTEGER NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
  sync_state TEXT NOT NULL, sync_message TEXT);
CREATE TABLE IF NOT EXISTS licenses (
  id TEXT PRIMARY KEY, client_id TEXT NOT NULL, project_code TEXT NOT NULL, project_name TEXT NOT NULL,
  machine_id TEXT NOT NULL, plan_name TEXT, max_users INTEGER NOT NULL, issued_at INTEGER NOT NULL,
  expiry_date TEXT NOT NULL, is_lifetime INTEGER NOT NULL, license TEXT NOT NULL, payload TEXT, features TEXT,
  status TEXT NOT NULL, block_reason TEXT, revision INTEGER NOT NULL, kid TEXT, origin TEXT NOT NULL,
  updated_at INTEGER NOT NULL, sync_state TEXT NOT NULL, sync_message TEXT);
CREATE INDEX IF NOT EXISTS idx_lic_client ON licenses(client_id);
CREATE INDEX IF NOT EXISTS idx_lic_machine ON licenses(machine_id);
`;

const toClient = (x: any): ClientRec => ({
  id: x.id, clientName: x.client_name, businessName: x.business_name, phone: x.phone, whatsapp: x.whatsapp ?? "",
  email: x.email ?? "", city: x.city ?? "", address: x.address ?? "", notes: x.notes ?? "", status: x.status,
  revision: x.revision, createdAt: x.created_at, updatedAt: x.updated_at, syncState: x.sync_state, syncMessage: x.sync_message ?? "",
});

const toLicense = (x: any): LicenseRec => ({
  id: x.id, clientId: x.client_id, projectCode: x.project_code, projectName: x.project_name, machineId: x.machine_id,
  planName: x.plan_name ?? "", maxUsers: x.max_users, issuedAt: x.issued_at, expiryDate: x.expiry_date, isLifetime: !!x.is_lifetime,
  license: x.license, payload: x.payload ? JSON.parse(x.payload) : decodePayloadUnsafe(x.license),
  features: x.features ? JSON.parse(x.features) : {}, status: x.status, blockReason: x.block_reason ?? "", revision: x.revision,
  kid: x.kid ?? "", origin: x.origin, updatedAt: x.updated_at, syncState: x.sync_state, syncMessage: x.sync_message ?? "",
});

export class SqliteStore implements Store {
  private db!: SQLite.SQLiteDatabase;

  async init() {
    this.db = await SQLite.openDatabaseAsync("licgen2.db");
    await this.db.execAsync("PRAGMA journal_mode = WAL;");
    await this.db.execAsync(SCHEMA);
    await this.migrateV2();
  }

  async kvGet(k: string) {
    const r = await this.db.getFirstAsync<{ v: string }>("SELECT v FROM kv WHERE k = ?", [k]);
    return r ? r.v : null;
  }
  async kvSet(k: string, v: string) {
    await this.db.runAsync("INSERT OR REPLACE INTO kv (k, v) VALUES (?, ?)", [k, v]);
  }
  async kvDel(k: string) {
    await this.db.runAsync("DELETE FROM kv WHERE k = ?", [k]);
  }

  async allClients() {
    return (await this.db.getAllAsync<any>("SELECT * FROM clients")).map(toClient);
  }
  async putClient(c: ClientRec) {
    await this.db.runAsync(
      `INSERT OR REPLACE INTO clients (id, client_name, business_name, phone, whatsapp, email, city, address, notes, status,
        revision, created_at, updated_at, sync_state, sync_message) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [c.id, c.clientName, c.businessName, c.phone, c.whatsapp, c.email, c.city, c.address, c.notes, c.status,
        c.revision, c.createdAt, c.updatedAt, c.syncState, c.syncMessage]
    );
  }
  async delClient(id: string) {
    await this.db.runAsync("DELETE FROM clients WHERE id = ?", [id]);
  }

  async allLicenses() {
    return (await this.db.getAllAsync<any>("SELECT * FROM licenses")).map(toLicense);
  }
  async putLicense(l: LicenseRec) {
    await this.db.runAsync(
      `INSERT OR REPLACE INTO licenses (id, client_id, project_code, project_name, machine_id, plan_name, max_users, issued_at,
        expiry_date, is_lifetime, license, payload, features, status, block_reason, revision, kid, origin, updated_at,
        sync_state, sync_message) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [l.id, l.clientId, l.projectCode, l.projectName, l.machineId, l.planName, l.maxUsers, l.issuedAt, l.expiryDate,
        l.isLifetime ? 1 : 0, l.license, l.payload ? JSON.stringify(l.payload) : null, JSON.stringify(l.features ?? {}),
        l.status, l.blockReason, l.revision, l.kid, l.origin, l.updatedAt, l.syncState, l.syncMessage]
    );
  }
  async delLicense(id: string) {
    await this.db.runAsync("DELETE FROM licenses WHERE id = ?", [id]);
  }

  // Old version stored everything in "licenses_v2" inside licenses.db (no clients). That file is left untouched;
  // rows are copied once into the new database.
  private async migrateV2() {
    if (await this.kvGet("migrated_v2")) return;
    let rows: any[] = [];
    try {
      const old = await SQLite.openDatabaseAsync("licenses.db");
      const t = await old.getFirstAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' AND name='licenses_v2'");
      if (t) rows = await old.getAllAsync<any>("SELECT * FROM licenses_v2 ORDER BY issued_at ASC");
      await old.closeAsync();
    } catch {
      return; // try again next start; nothing is lost
    }
    const byKey = new Map<string, string>();
    const now = Date.now();
    for (const r of rows) {
      const key = `${String(r.client_name).trim().toLowerCase()}|${String(r.phone).trim()}`;
      let cid = byKey.get(key);
      if (!cid) {
        cid = uuid4();
        byKey.set(key, cid);
        await this.putClient({
          id: cid, clientName: r.client_name, businessName: r.client_name, phone: String(r.phone || "").trim(),
          whatsapp: String(r.phone || "").trim(), email: "", city: "", address: "", notes: "Purani app se import",
          status: "active", revision: 1, createdAt: r.issued_at * 1000, updatedAt: now, syncState: "legacy", syncMessage: "",
        });
      }
      const payload = r.payload ? JSON.parse(r.payload) : decodePayloadUnsafe(r.license);
      await this.putLicense({
        id: uuid4(), clientId: cid, projectCode: r.project_code, projectName: r.project_name, machineId: r.machine_id,
        planName: r.plan_name, maxUsers: r.max_users, issuedAt: r.issued_at, expiryDate: r.expiry_date, isLifetime: !!r.is_lifetime,
        license: r.license, payload, features: payload?.features ?? {}, status: "active", blockReason: "", revision: 1,
        kid: "", origin: "generator", updatedAt: now, syncState: "legacy", syncMessage: "",
      });
    }
    await this.kvSet("migrated_v2", "1");
  }
}
