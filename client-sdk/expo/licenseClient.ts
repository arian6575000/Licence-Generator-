// License check for Expo / React Native client apps.
// Install: npx expo install expo-secure-store expo-application expo-device expo-crypto && npm i tweetnacl tweetnacl-util
import * as SecureStore from "expo-secure-store";
import { hasFeature, Payload, Reason, verifyLicense, VerifyResult } from "./licenseCore";
import { getDeviceId } from "./deviceId";

// ====== CHANGE THESE TWO PER APP ======
export const PROJECT_CODE = "darzihub"; // same project code as in the generator's Projects tab
export const PUBLIC_KEY_HEX = "PASTE_PUBLIC_KEY_HEX_FROM_GENERATOR_KEYS_TAB";
// ======================================

const K_LICENSE = "mpos_license";
const K_LASTSEEN = "mpos_lastseen";

async function check(license: string): Promise<VerifyResult> {
  const seen = await SecureStore.getItemAsync(K_LASTSEEN);
  const lastSeen = seen ? parseInt(seen, 10) : undefined;
  const r = verifyLicense(license, {
    publicKeyHex: PUBLIC_KEY_HEX,
    machineId: await getDeviceId(),
    projectCode: PROJECT_CODE,
    lastSeen,
  });
  if (r.ok) await SecureStore.setItemAsync(K_LASTSEEN, String(Math.max(Date.now(), lastSeen ?? 0)));
  return r;
}

/** User pasted a license: save it only if valid. */
export async function activateLicense(license: string): Promise<VerifyResult> {
  const r = await check(license);
  if (r.ok) await SecureStore.setItemAsync(K_LICENSE, license.trim());
  return r;
}

/** Call on every app start and when the app returns to foreground. */
export async function checkSavedLicense(): Promise<VerifyResult> {
  const saved = await SecureStore.getItemAsync(K_LICENSE);
  if (!saved) return { ok: false, reason: "format" };
  return check(saved);
}

/** Use after a successful check: if (can(payload, "premium")) ... */
export const can = (p: Payload, feature: string) => hasFeature(p, feature);

export const REASON_TEXT: Record<Reason, string> = {
  format: "License maujood nahi ya format galat hai",
  signature: "License sahi nahi (signature)",
  project: "Yeh license is app ka nahi",
  machine: "Yeh license is device ka nahi",
  expired: "License ki muddat khatam ho gayi",
  clock: "Device ki date/time galat hai, sahi karein",
};
