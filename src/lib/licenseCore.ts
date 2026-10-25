// Pure license logic (no Expo / RN imports) so it runs in the app, in Node tests,
// and can be copied as-is into client apps.
import nacl from "tweetnacl";
import { decodeBase64, encodeBase64 } from "tweetnacl-util";

export const LICENSE_PREFIX = "GLN1";
export const LIFETIME = 0; // exp === 0 means no expiry

export type LicensePayload = {
  v: 1;
  id: string; // unique license id
  app: string; // app code, e.g. "darzihub"
  did: string; // normalized device id
  name: string; // customer name
  iat: number; // issued at (unix seconds)
  exp: number; // expires at (unix seconds), 0 = lifetime
};

// ---------- base64url ----------
export const toB64Url = (b: Uint8Array) =>
  encodeBase64(b).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export const fromB64Url = (s: string) => {
  let t = s.replace(/-/g, "+").replace(/_/g, "/");
  while (t.length % 4) t += "=";
  return decodeBase64(t);
};

const utf8 = (s: string) => new TextEncoder().encode(s);
const unutf8 = (b: Uint8Array) => new TextDecoder().decode(b);

// ---------- device id ----------
// Client apps produce: first 20 hex chars of SHA-256("GLN-DEVID-v1|" + parts.join("|"))
// shown as XXXX-XXXX-XXXX-XXXX-XXXX.
export function normalizeDeviceId(input: string): string | null {
  const raw = input.toUpperCase().replace(/[^0-9A-F]/g, "");
  if (raw.length !== 20) return null;
  return raw.match(/.{4}/g)!.join("-");
}

export function formatDeviceIdFromHex(hex: string): string {
  return normalizeDeviceId(hex.slice(0, 20))!;
}

// ---------- keys ----------
export function generateKeyPair() {
  const kp = nacl.sign.keyPair();
  return { publicKey: toB64Url(kp.publicKey), secretKey: toB64Url(kp.secretKey) };
}

export function publicKeyFromSecret(secretKeyB64: string): string {
  const sk = fromB64Url(secretKeyB64);
  return toB64Url(nacl.sign.keyPair.fromSecretKey(sk).publicKey);
}

// ---------- create ----------
export function newLicenseId(): string {
  const b = nacl.randomBytes(5);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("").toUpperCase();
}

export function buildPayload(args: {
  app: string;
  deviceId: string;
  name: string;
  days: number | "lifetime";
  now?: number; // unix seconds
}): LicensePayload {
  const did = normalizeDeviceId(args.deviceId);
  if (!did) throw new Error("Device ID galat hai (20 hex characters chahiye)");
  const app = args.app.trim().toLowerCase();
  if (!/^[a-z0-9_.-]{2,40}$/.test(app)) throw new Error("App code galat hai");
  const name = args.name.trim();
  if (!name) throw new Error("Name likhna zaroori hai");
  const iat = args.now ?? Math.floor(Date.now() / 1000);
  let exp = LIFETIME;
  if (args.days !== "lifetime") {
    if (!Number.isFinite(args.days) || args.days < 1) throw new Error("Din kam az kam 1 hon");
    exp = iat + Math.floor(args.days) * 86400;
  }
  return { v: 1, id: newLicenseId(), app, did, name, iat, exp };
}

export function signLicense(payload: LicensePayload, secretKeyB64: string): string {
  const body = utf8(JSON.stringify(payload));
  const sig = nacl.sign.detached(body, fromB64Url(secretKeyB64));
  return `${LICENSE_PREFIX}.${toB64Url(body)}.${toB64Url(sig)}`;
}

// ---------- verify (same logic goes into client apps) ----------
export type VerifyResult =
  | { ok: true; payload: LicensePayload; daysLeft: number | null }
  | { ok: false; reason: "format" | "signature" | "app" | "device" | "expired" | "clock" };

export function verifyLicense(
  license: string,
  opts: {
    publicKeyB64: string;
    app: string;
    deviceId: string;
    now?: number; // unix seconds
    lastSeen?: number; // last time app ran (unix seconds) - clock rollback guard
  }
): VerifyResult {
  try {
    const parts = license.trim().split(".");
    if (parts.length !== 3 || parts[0] !== LICENSE_PREFIX) return { ok: false, reason: "format" };
    const body = fromB64Url(parts[1]);
    const sig = fromB64Url(parts[2]);
    if (!nacl.sign.detached.verify(body, sig, fromB64Url(opts.publicKeyB64)))
      return { ok: false, reason: "signature" };
    const p = JSON.parse(unutf8(body)) as LicensePayload;
    if (p.app !== opts.app.toLowerCase()) return { ok: false, reason: "app" };
    if (p.did !== normalizeDeviceId(opts.deviceId)) return { ok: false, reason: "device" };
    const now = opts.now ?? Math.floor(Date.now() / 1000);
    if (opts.lastSeen && now + 300 < opts.lastSeen) return { ok: false, reason: "clock" };
    if (p.exp !== LIFETIME && now >= p.exp) return { ok: false, reason: "expired" };
    return {
      ok: true,
      payload: p,
      daysLeft: p.exp === LIFETIME ? null : Math.ceil((p.exp - now) / 86400),
    };
  } catch {
    return { ok: false, reason: "format" };
  }
}
