// Native: SQLite history of every generated license.
import * as SQLite from "expo-sqlite";
import type { LicenseRecord } from "./types";

let dbp: Promise<SQLite.SQLiteDatabase> | null = null;
function db() {
  if (!dbp) {
    dbp = SQLite.openDatabaseAsync("licenses.db").then(async (d) => {
      await d.execAsync(`CREATE TABLE IF NOT EXISTS licenses_v2 (
        id TEXT PRIMARY KEY, project_code TEXT NOT NULL, project_name TEXT NOT NULL,
        client_name TEXT NOT NULL, phone TEXT NOT NULL, machine_id TEXT NOT NULL,
        plan_name TEXT NOT NULL, max_users INTEGER NOT NULL, issued_at INTEGER NOT NULL,
        expiry_date TEXT NOT NULL, is_lifetime INTEGER NOT NULL, license TEXT NOT NULL, payload TEXT NOT NULL);`);
      return d;
    });
  }
  return dbp;
}

export async function addRecord(r: LicenseRecord) {
  const d = await db();
  await d.runAsync(
    `INSERT INTO licenses_v2 (id, project_code, project_name, client_name, phone, machine_id, plan_name,
      max_users, issued_at, expiry_date, is_lifetime, license, payload) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [r.id, r.projectCode, r.projectName, r.clientName, r.phone, r.machineId, r.planName, r.maxUsers,
      r.issuedAt, r.expiryDate, r.isLifetime ? 1 : 0, r.license, JSON.stringify(r.payload)]
  );
}

export async function listRecords(search = "", projectCode = ""): Promise<LicenseRecord[]> {
  const d = await db();
  const q = `%${search.trim()}%`;
  const rows = await d.getAllAsync<any>(
    `SELECT * FROM licenses_v2 WHERE (? = '' OR project_code = ?)
       AND (client_name LIKE ? OR machine_id LIKE ? OR phone LIKE ? OR id LIKE ? OR project_name LIKE ?)
     ORDER BY issued_at DESC`,
    [projectCode, projectCode, q, q, q, q, q]
  );
  return rows.map((x) => ({
    id: x.id, projectCode: x.project_code, projectName: x.project_name, clientName: x.client_name,
    phone: x.phone, machineId: x.machine_id, planName: x.plan_name, maxUsers: x.max_users,
    issuedAt: x.issued_at, expiryDate: x.expiry_date, isLifetime: !!x.is_lifetime,
    license: x.license, payload: JSON.parse(x.payload),
  }));
}
