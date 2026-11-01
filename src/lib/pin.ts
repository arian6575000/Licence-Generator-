// App-lock PIN helpers (pure). The hash is stored in the Android Keystore-backed secure store.
import nacl from "tweetnacl";

const enc = new TextEncoder();
const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

export function newSalt(): string {
  return hex(nacl.randomBytes(16));
}

// Iterated SHA-512 (a simple stretch; the real protection is the hardware-backed store + the lockout below).
export function hashPin(pin: string, salt: string): string {
  let h = nacl.hash(enc.encode(`${salt}:${pin}`));
  for (let i = 0; i < 4000; i++) h = nacl.hash(h);
  return hex(h);
}

export function verifyPin(pin: string, salt: string, expected: string): boolean {
  const got = hashPin(pin, salt);
  if (got.length !== expected.length) return false;
  let d = 0;
  for (let i = 0; i < got.length; i++) d |= got.charCodeAt(i) ^ expected.charCodeAt(i);
  return d === 0;
}

export const isValidPin = (p: string) => /^\d{4,8}$/.test(p);

// seconds to wait after N wrong attempts in a row
export function lockoutSeconds(failures: number): number {
  if (failures < 5) return 0;
  return Math.min(3600, 30 * 2 ** (failures - 5));
}
