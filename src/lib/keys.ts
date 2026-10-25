// Native (Android/iOS): private key lives in the secure keystore.
import * as SecureStore from "expo-secure-store";
import type { KeyPair } from "./types";

const K = "gln_keypair_v1";

export async function loadKeys(): Promise<KeyPair | null> {
  const s = await SecureStore.getItemAsync(K);
  return s ? (JSON.parse(s) as KeyPair) : null;
}
export async function saveKeys(kp: KeyPair) {
  await SecureStore.setItemAsync(K, JSON.stringify(kp));
}
export async function deleteKeys() {
  await SecureStore.deleteItemAsync(K);
}
