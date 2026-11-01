// Android Keystore-backed storage (expo-secure-store): session tokens, signing keys, PIN.
import * as SecureStore from "expo-secure-store";
import type { Session, SessionStorage } from "../lib/hub";
import type { KeyVault } from "../lib/store";
import { newSalt } from "../lib/pin";
import { uuid4 } from "../lib/ids";

const opts = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
// SecureStore names may only use letters, digits, '.', '-' and '_'
const safe = (n: string) => "lg_" + n.replace(/[^A-Za-z0-9._-]/g, "_");

export const vault: KeyVault = {
  get: (n) => SecureStore.getItemAsync(safe(n), opts),
  set: (n, v) => SecureStore.setItemAsync(safe(n), v, opts),
  del: (n) => SecureStore.deleteItemAsync(safe(n), opts),
};

export const sessionStorage: SessionStorage = {
  async load() {
    const s = await SecureStore.getItemAsync("lg_session", opts);
    if (!s) return null;
    try {
      return JSON.parse(s) as Session;
    } catch {
      return null;
    }
  },
  save: (s) => SecureStore.setItemAsync("lg_session", JSON.stringify(s), opts),
  clear: () => SecureStore.deleteItemAsync("lg_session", opts),
};

// Stable id of this phone for the Hub (survives logout, lost on uninstall).
export async function getDeviceId(): Promise<string> {
  let id = await SecureStore.getItemAsync("lg_device_id", opts);
  if (!id) {
    id = `gen-${uuid4()}`;
    await SecureStore.setItemAsync("lg_device_id", id, opts);
  }
  return id;
}

// ---- PIN ----
export type PinRecord = { salt: string; hash: string };
export async function loadPin(): Promise<PinRecord | null> {
  const s = await SecureStore.getItemAsync("lg_pin", opts);
  return s ? (JSON.parse(s) as PinRecord) : null;
}
export async function savePin(hash: string, salt: string) {
  await SecureStore.setItemAsync("lg_pin", JSON.stringify({ salt, hash }), opts);
}
export { newSalt };

export type PinFails = { count: number; until: number };
export async function loadFails(): Promise<PinFails> {
  const s = await SecureStore.getItemAsync("lg_pin_fails", opts);
  return s ? (JSON.parse(s) as PinFails) : { count: 0, until: 0 };
}
export async function saveFails(f: PinFails) {
  await SecureStore.setItemAsync("lg_pin_fails", JSON.stringify(f), opts);
}

export async function getFlag(name: string): Promise<boolean> {
  return (await SecureStore.getItemAsync(safe("flag_" + name), opts)) === "1";
}
export async function setFlag(name: string, v: boolean) {
  await SecureStore.setItemAsync(safe("flag_" + name), v ? "1" : "0", opts);
}

// Logout: tokens and signing keys go, local data (clients/licenses) stays.
export async function wipeSecrets(codes: string[]) {
  await SecureStore.deleteItemAsync("lg_session", opts);
  await SecureStore.deleteItemAsync(safe("key:__default__"), opts);
  for (const c of codes) await SecureStore.deleteItemAsync(safe(`key:${c}`), opts);
}
