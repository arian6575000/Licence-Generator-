// Web / Electron: history in local storage.
import type { LicenseRecord } from "./types";

const K = "gln_history_v1";
const read = (): LicenseRecord[] => {
  try { return JSON.parse(localStorage.getItem(K) || "[]"); } catch { return []; }
};

export async function addRecord(r: LicenseRecord) {
  localStorage.setItem(K, JSON.stringify([r, ...read()]));
}

export async function listRecords(search = ""): Promise<LicenseRecord[]> {
  const q = search.trim().toLowerCase();
  const all = read();
  if (!q) return all;
  return all.filter((r) =>
    [r.app, r.deviceId, r.name, r.id].some((v) => v.toLowerCase().includes(q))
  );
}

export async function distinctApps(): Promise<string[]> {
  return Array.from(new Set(read().map((r) => r.app))).sort();
}
