// Rules that decide whether this phone may issue licenses right now.
import { OFFLINE_GRACE_DAYS } from "./config";
import type { Repo } from "./store";

export type Guard = { ok: true; daysSinceSync: number | null } | { ok: false; reason: string };

const DAY = 86400000;
const CLOCK_TOLERANCE_MS = 5 * 60 * 1000;

export type GuardInput = {
  hasKeys: boolean;
  lastSyncAt: number; // ms, 0 = never
  maxSeenMs: number; // largest phone time ever observed
  revokedMsg: string;
  nowMs: number;
  graceDays?: number;
};

export function evaluateGuard(g: GuardInput): Guard {
  const grace = g.graceDays ?? OFFLINE_GRACE_DAYS;
  if (g.revokedMsg) return { ok: false, reason: `Yeh device Hub se revoke ho chuka hai: ${g.revokedMsg}` };
  if (!g.hasKeys || !g.lastSyncAt) return { ok: false, reason: "Pehle internet par Hub se sync karein (signing keys abhi nahi mili)" };
  if (g.maxSeenMs && g.nowMs < g.maxSeenMs - CLOCK_TOLERANCE_MS)
    return { ok: false, reason: "Phone ki date/time peeche ki gayi lagti hai. Sahi time lagayen aur sync karein" };
  const days = (g.nowMs - g.lastSyncAt) / DAY;
  if (days > grace) return { ok: false, reason: `${Math.floor(days)} din se sync nahi hua (hadd ${grace} din). Internet par sync karein` };
  return { ok: true, daysSinceSync: Math.max(0, days) };
}

// "Now" corrected by the last known difference between this phone and the Hub clock.
export async function trustedNow(repo: Repo, realNow = Date.now()): Promise<number> {
  const skew = await repo.getNum("server_skew_ms");
  return realNow + skew;
}

export async function currentGuard(repo: Repo, hasKeys: boolean, realNow = Date.now()): Promise<Guard> {
  const [lastSyncAt, maxSeenMs, revokedMsg] = await Promise.all([
    repo.getNum("last_sync_at"),
    repo.getNum("max_seen_ms"),
    repo.store.kvGet("revoked_msg"),
  ]);
  return evaluateGuard({ hasKeys, lastSyncAt, maxSeenMs, revokedMsg: revokedMsg ?? "", nowMs: realNow });
}

// Call whenever the app is opened/resumed. Never moves backwards.
export async function noteClock(repo: Repo, realNow = Date.now()) {
  const seen = await repo.getNum("max_seen_ms");
  if (realNow > seen) await repo.setNum("max_seen_ms", realNow);
}
