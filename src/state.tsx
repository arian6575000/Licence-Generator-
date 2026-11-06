// App-wide state: storage, Hub client, session, PIN lock, sync status.
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import * as LocalAuth from "expo-local-authentication";
import * as Network from "expo-network";
import * as ScreenCapture from "expo-screen-capture";
import { APP_VERSION, LOCK_AFTER_BACKGROUND_MS } from "./lib/config";
import { HubClient, HubError, Session } from "./lib/hub";
import { hashPin, isValidPin, lockoutSeconds, newSalt, verifyPin } from "./lib/pin";
import { currentGuard, Guard, noteClock } from "./lib/safety";
import { Repo } from "./lib/store";
import { runSync as coreSync, SyncResult } from "./lib/sync";
import { getDeviceId, getFlag, loadFails, loadPin, saveFails, savePin, sessionStorage, setFlag, vault, wipeSecrets } from "./native/secure";
import { SqliteStore } from "./native/sqliteStore";

const store = new SqliteStore();
const repo = new Repo(store);
const hub = new HubClient(sessionStorage);

export type SyncStatus = {
  running: boolean;
  last: SyncResult | null;
  lastSyncAt: number;
  pending: number;
  problems: number;
  legacy: number;
};

type Ctx = {
  ready: boolean;
  session: Session | null;
  hasPin: boolean;
  locked: boolean;
  biometric: boolean;
  guard: Guard;
  hasKeys: boolean;
  sync: SyncStatus;
  version: number; // bumps whenever local data changes; screens reload on it
  repo: Repo;
  hub: HubClient;
  deps: { repo: Repo; vault: typeof vault; hub: HubClient };
  login: (a: { baseUrl: string; username: string; password: string; deviceName: string }) => Promise<void>;
  logout: () => Promise<void>;
  runSync: () => Promise<SyncResult | null>;
  afterChange: () => void;
  setupPin: (pin: string) => Promise<void>;
  unlock: (pin: string) => Promise<{ ok: boolean; message: string }>;
  tryBiometric: () => Promise<boolean>;
  lock: () => void;
  setBiometric: (on: boolean) => Promise<void>;
};

const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => {
  const c = useContext(AppCtx);
  if (!c) throw new Error("AppProvider missing");
  return c;
};

const emptySync: SyncStatus = { running: false, last: null, lastSyncAt: 0, pending: 0, problems: 0, legacy: 0 };

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [hasPin, setHasPin] = useState(false);
  const [locked, setLocked] = useState(true);
  const [biometric, setBio] = useState(false);
  const [guard, setGuard] = useState<Guard>({ ok: false, reason: "..." });
  const [hasKeys, setHasKeys] = useState(false);
  const [sync, setSync] = useState<SyncStatus>(emptySync);
  const [version, setVersion] = useState(0);
  const running = useRef(false);
  const lastRun = useRef(0);
  const bgAt = useRef(0);
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;

  const refreshStatus = useCallback(async () => {
    const [pending, problems, legacy, lastSyncAt, hasKey] = await Promise.all([
      repo.pendingCount(), repo.problemCount(), repo.legacyCount(), repo.getNum("last_sync_at"), vault.get("key:__default__"),
    ]);
    setSync((p) => ({ ...p, pending, problems, legacy, lastSyncAt }));
    setHasKeys(!!hasKey);
    setGuard(await currentGuard(repo, !!hasKey));
    setVersion((v) => v + 1);
  }, []);

  const runSync = useCallback(async (): Promise<SyncResult | null> => {
    if (running.current || !sessionRef.current) return null;
    running.current = true;
    lastRun.current = Date.now();
    setSync((p) => ({ ...p, running: true }));
    try {
      const res = await coreSync({ repo, hub, vault });
      if (res.auth) setSession(null);
      setSync((p) => ({ ...p, last: res }));
      return res;
    } finally {
      running.current = false;
      setSync((p) => ({ ...p, running: false }));
      await refreshStatus();
    }
  }, [refreshStatus]);

  // ---- startup ----
  useEffect(() => {
    (async () => {
      await store.init();
      await noteClock(repo);
      const [sess, pin, bio] = await Promise.all([sessionStorage.load(), loadPin(), getFlag("biometric")]);
      setSession(sess);
      setHasPin(!!pin);
      setBio(bio);
      setLocked(!!pin);
      try {
        await ScreenCapture.preventScreenCaptureAsync(); // no screenshots / screen recording of keys and licenses
      } catch {}
      await refreshStatus();
      setReady(true);
    })().catch((e) => console.warn("startup failed", e));
  }, [refreshStatus]);

  // ---- foreground: relock after a while, sync ----
  useEffect(() => {
    const sub = AppState.addEventListener("change", (st) => {
      if (st === "background" || st === "inactive") {
        if (!bgAt.current) bgAt.current = Date.now();
      } else if (st === "active") {
        const away = bgAt.current ? Date.now() - bgAt.current : 0;
        bgAt.current = 0;
        if (away > LOCK_AFTER_BACKGROUND_MS) setLocked((l) => l || hasPinRef.current);
        noteClock(repo).then(refreshStatus);
        if (sessionRef.current && Date.now() - lastRun.current > 30000) runSync();
      }
    });
    return () => sub.remove();
  }, [refreshStatus, runSync]);
  const hasPinRef = useRef(false);
  hasPinRef.current = hasPin;

  // ---- back online: sync ----
  useEffect(() => {
    const sub = Network.addNetworkStateListener((st) => {
      if (st.isConnected && st.isInternetReachable !== false && sessionRef.current && Date.now() - lastRun.current > 15000) runSync();
    });
    return () => sub.remove();
  }, [runSync]);

  const login: Ctx["login"] = useCallback(
    async ({ baseUrl, username, password, deviceName }) => {
      const deviceId = await getDeviceId();
      await hub.login({ baseUrl, username, password, deviceId, deviceName, appVersion: APP_VERSION });
      setSession(await sessionStorage.load());
      setTimeout(() => runSync(), 0);
    },
    [runSync]
  );

  const logout = useCallback(async () => {
    const codes = await repo.getJSON<string[]>("key_codes", []);
    await wipeSecrets(codes);
    await repo.store.kvDel("last_sync_at");
    await repo.store.kvDel("pull_cursor");
    setSession(null);
    await refreshStatus();
  }, [refreshStatus]);

  const afterChange = useCallback(() => {
    refreshStatus();
    if (sessionRef.current) setTimeout(() => runSync(), 0); // best effort; fails quietly when offline
  }, [refreshStatus, runSync]);

  const setupPin = useCallback(async (pin: string) => {
    if (!isValidPin(pin)) throw new Error("PIN must be 4 to 8 digits");
    const salt = newSalt();
    await savePin(hashPin(pin, salt), salt);
    await saveFails({ count: 0, until: 0 });
    setHasPin(true);
    setLocked(false);
  }, []);

  const unlock = useCallback(async (pin: string) => {
    const f = await loadFails();
    if (f.until > Date.now()) return { ok: false, message: `Try again in ${Math.ceil((f.until - Date.now()) / 1000)} seconds` };
    const rec = await loadPin();
    if (!rec) return { ok: false, message: "No PIN is set" };
    if (verifyPin(pin, rec.salt, rec.hash)) {
      await saveFails({ count: 0, until: 0 });
      setLocked(false);
      return { ok: true, message: "" };
    }
    const count = f.count + 1;
    const wait = lockoutSeconds(count);
    await saveFails({ count, until: wait ? Date.now() + wait * 1000 : 0 });
    return { ok: false, message: wait ? `Wrong PIN. Wait ${wait} seconds` : `Wrong PIN (${count})` };
  }, []);

  const tryBiometric = useCallback(async () => {
    try {
      if (!(await LocalAuth.hasHardwareAsync()) || !(await LocalAuth.isEnrolledAsync())) return false;
      const r = await LocalAuth.authenticateAsync({ promptMessage: "Unlock License Generator", cancelLabel: "Use PIN", disableDeviceFallback: true });
      if (r.success) setLocked(false);
      return r.success;
    } catch {
      return false;
    }
  }, []);

  const setBiometric = useCallback(async (on: boolean) => {
    await setFlag("biometric", on);
    setBio(on);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      ready, session, hasPin, locked, biometric, guard, hasKeys, sync, version, repo, hub,
      deps: { repo, vault, hub },
      login, logout, runSync, afterChange, setupPin, unlock, tryBiometric, lock: () => setLocked(true), setBiometric,
    }),
    [ready, session, hasPin, locked, biometric, guard, hasKeys, sync, version, login, logout, runSync, afterChange, setupPin, unlock, tryBiometric, setBiometric]
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export { HubError };
