import { EXPIRY_WARN_DAYS } from "./config";
import type { LicenseRec } from "./types";

export type LicStatus = "active" | "expiring" | "expired" | "blocked" | "suspended";

export function licStatus(l: LicenseRec, todayIso: string): LicStatus {
  if (l.status === "blocked") return "blocked";
  if (l.status === "suspended") return "suspended";
  if (l.isLifetime) return "active";
  if (l.expiryDate < todayIso) return "expired";
  const days = Math.round((Date.parse(l.expiryDate + "T00:00:00Z") - Date.parse(todayIso + "T00:00:00Z")) / 86400000);
  return days <= EXPIRY_WARN_DAYS ? "expiring" : "active";
}

export const STATUS_LABEL: Record<LicStatus, string> = {
  active: "Active", expiring: "Jaldi khatam", expired: "Expired", blocked: "Blocked (Hub)", suspended: "Suspended (Hub)",
};

export function daysLeft(l: LicenseRec, todayIso: string): number | null {
  if (l.isLifetime) return null;
  return Math.round((Date.parse(l.expiryDate + "T00:00:00Z") - Date.parse(todayIso + "T00:00:00Z")) / 86400000);
}
