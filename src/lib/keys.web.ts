// Web / Electron (exe): stored in the app's local storage (Electron profile folder of the Windows user).
import type { KeyPair } from "./types";

const K = "mpos_keypair_v1";

export async function loadKeys(): Promise<KeyPair | null> {
  const s = localStorage.getItem(K);
  return s ? (JSON.parse(s) as KeyPair) : null;
}
export async function saveKeys(kp: KeyPair) {
  localStorage.setItem(K, JSON.stringify(kp));
}
export async function deleteKeys() {
  localStorage.removeItem(K);
}
