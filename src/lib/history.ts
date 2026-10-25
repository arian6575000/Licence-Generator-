// Native: SQLite history.
import * as SQLite from "expo-sqlite";
import type { LicenseRecord } from "./types";

let dbp: Promise<SQLite.SQLiteDatabase> | null = null;
function db() {
  if (!dbp) {
    dbp = SQLite.openDatabaseAsync("licenses.db").then(async (d) => {
      await d.execAsync(`CREATE TABLE IF NOT EXISTS licenses (
        id TEXT PRIMARY KEY, app TEXT NOT NULL, device_id TEXT NOT NULL, name TEXT NOT NULL,
        issued_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, license TEXT NOT NULL);`);
      return d;
    });
  }
  return dbp;
}

export async function addRecord(r: LicenseRecord) {
  const d = await db();
  await d.runAsync(
    "INSERT INTO licenses (id, app, device_id, name, issued_at, expires_at, license) VALUES (?,?,?,?,?,?,?)",
    [r.id, r.app, r.deviceId, r.name, r.issuedAt, r.expiresAt, r.license]
  );
}

export async function listRecords(search = ""): Promise<LicenseRecord[]> {
  const d = await db();
  const q = `%${search.trim()}%`;
  const rows = await d.getAllAsync<any>(
    `SELECT * FROM licenses WHERE app LIKE ? OR device_id LIKE ? OR name LIKE ? OR id LIKE ?
     ORDER BY issued_at DESC`,
    [q, q, q, q]
  );
  return rows.map((x) => ({
    id: x.id, app: x.app, deviceId: x.device_id, name: x.name,
    issuedAt: x.issued_at, expiresAt: x.expires_at, license: x.license,
  }));
}

export async function distinctApps(): Promise<string[]> {
  const d = await db();
  const rows = await d.getAllAsync<{ app: string }>("SELECT DISTINCT app FROM licenses ORDER BY app");
  return rows.map((r) => r.app);
}
