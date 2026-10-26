// Web / Electron: history in local storage.
import type { LicenseRecord } from "./types";

const K = "mpos_history_v2";
const read = (): LicenseRecord[] => {
  try { return JSON.parse(localStorage.getItem(K) || "[]"); } catch { return []; }
};

export async function addRecord(r: LicenseRecord) {
  localStorage.setItem(K, JSON.stringify([r, ...read()]));
}

export async function listRecords(search = "", projectCode = ""): Promise<LicenseRecord[]> {
  const q = search.trim().toLowerCase();
  return read().filter(
    (r) =>
      (!projectCode || r.projectCode === projectCode) &&
      (!q || [r.clientName, r.machineId, r.phone, r.id, r.projectName].some((v) => (v || "").toLowerCase().includes(q)))
  );
}
