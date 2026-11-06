// WhatsApp / dialer helpers and the message sent to a client with their license.
import { Linking } from "react-native";
import { COMPANY_CREDIT, DEFAULT_COUNTRY_CODE } from "./config";
import type { LicenseRec } from "./types";

/** International digits only, no "+": 0300-1234567 -> 923001234567 ; +92 300 1234567 -> 923001234567 */
export function waNumber(phone: string, cc = DEFAULT_COUNTRY_CODE): string {
  let p = phone.replace(/[\s\-()]/g, "");
  if (p.startsWith("+")) return p.slice(1).replace(/\D/g, "");
  p = p.replace(/\D/g, "");
  if (p.startsWith("00")) return p.slice(2);
  if (p.startsWith("0")) return cc + p.slice(1);
  return p;
}

export const callLink = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;
export const waLink = (phone: string, text?: string) => `https://wa.me/${waNumber(phone)}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

/** Opens the phone dialer (does not call by itself). */
export async function openDialer(phone: string): Promise<boolean> {
  try { await Linking.openURL(callLink(phone)); return true; } catch { return false; }
}
/** Opens WhatsApp chat with the number (message prefilled). Returns false if it could not be opened. */
export async function openWhatsApp(phone: string, text?: string): Promise<boolean> {
  try { await Linking.openURL(waLink(phone, text)); return true; } catch { return false; }
}
export async function openEmail(to: string, subject = "", body = ""): Promise<boolean> {
  try { await Linking.openURL(`mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`); return true; } catch { return false; }
}

export function licenseMessage(l: Pick<LicenseRec, "projectName" | "planName" | "isLifetime" | "expiryDate" | "license">, clientName: string): string {
  const out: string[] = [`Hello ${clientName},`, "", `Your ${l.projectName} license is ready.`];
  if (l.planName) out.push(`Plan: ${l.planName}`);
  out.push(`Valid until: ${l.isLifetime ? "Lifetime" : l.expiryDate}`, "");
  out.push("To activate:", `1. Open ${l.projectName} on your device.`, "2. On the activation screen, paste the license key below and tap Activate.", "");
  out.push(l.license, "", `— ${COMPANY_CREDIT}`);
  return out.join("\n");
}
