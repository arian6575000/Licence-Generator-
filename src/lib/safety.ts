// Rules that decide whether this phone may issue licenses right now.
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
};

// Generating a license never needs the server. The only requirements are:
//  - the signing keys were downloaded once (first sync),
//  - this phone was not revoked (the Hub tells us on the next sync),
//  - the phone clock was not turned back.
// There is NO limit on how long the phone may stay offline.
export function evaluateGuard(g: GuardInput): Guard {
  if (g.revokedMsg) return { ok: false, reason: `This device was revoked by the Hub: ${g.revokedMsg}` };
  if (!g.hasKeys) return { ok: false, reason: "Sign in and sync once to download the signing keys. After that the app works fully offline." };
  if (g.maxSeenMs && g.nowMs < g.maxSeenMs - CLOCK_TOLERANCE_MS)
    return { ok: false, reason: "The phone date/time looks wrong (set back). Correct it to continue." };
  return { ok: true, daysSinceSync: g.lastSyncAt ? Math.max(0, (g.nowMs - g.lastSyncAt) / DAY) : null };
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
