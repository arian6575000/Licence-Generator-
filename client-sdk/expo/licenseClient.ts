// License check for Expo / React Native client apps.
// Install: npx expo install expo-secure-store && npm i tweetnacl tweetnacl-util
// Also copy ../../src/lib/licenseCore.ts next to this file (public parts only are used).
import * as SecureStore from "expo-secure-store";
import { verifyLicense, VerifyResult } from "./licenseCore";
import { getDeviceId } from "./deviceId";

// ====== CHANGE THESE TWO PER APP ======
export const APP_CODE = "darzihub"; // must match the App code used in the generator
export const PUBLIC_KEY = "PASTE_PUBLIC_KEY_FROM_GENERATOR_KEYS_TAB";
// ======================================

const K_LICENSE = "gln_license";
const K_LASTSEEN = "gln_lastseen";

const nowSec = () => Math.floor(Date.now() / 1000);

async function check(license: string): Promise<VerifyResult> {
  const lastSeenStr = await SecureStore.getItemAsync(K_LASTSEEN);
  const lastSeen = lastSeenStr ? parseInt(lastSeenStr, 10) : undefined;
  const r = verifyLicense(license, {
    publicKeyB64: PUBLIC_KEY,
    app: APP_CODE,
    deviceId: await getDeviceId(),
    now: nowSec(),
    lastSeen,
  });
  // Only move "last seen" forward, and only while the license is otherwise fine.
  if (r.ok) await SecureStore.setItemAsync(K_LASTSEEN, String(Math.max(nowSec(), lastSeen ?? 0)));
  return r;
}

/** Called when the user pastes a license. Saves it only if valid. */
export async function activateLicense(license: string): Promise<VerifyResult> {
  const r = await check(license);
  if (r.ok) await SecureStore.setItemAsync(K_LICENSE, license.trim());
  return r;
}

/** Called on every app start (and when coming back to foreground). */
export async function checkSavedLicense(): Promise<VerifyResult> {
  const saved = await SecureStore.getItemAsync(K_LICENSE);
  if (!saved) return { ok: false, reason: "format" };
  return check(saved);
}

export const REASON_TEXT: Record<string, string> = {
  format: "License maujood nahi ya format galat hai",
  signature: "License sahi nahi (signature)",
  app: "Yeh license is app ka nahi",
  device: "Yeh license is device ka nahi",
  expired: "License ki muddat khatam ho gayi",
  clock: "Device ki date/time galat hai, sahi karein",
};
