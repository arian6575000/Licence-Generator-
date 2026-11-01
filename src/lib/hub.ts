// HTTP client for the RetailX License Hub (FastAPI). Pure TypeScript: fetch is injectable for tests.
import { HTTP_TIMEOUT_MS } from "./config";

export type Session = {
  baseUrl: string;
  accessToken: string;
  refreshToken: string;
  username: string;
  deviceId: string;
  deviceName: string;
};

export interface SessionStorage {
  load(): Promise<Session | null>;
  save(s: Session): Promise<void>;
  clear(): Promise<void>;
}

export type HubErrorKind = "network" | "auth" | "revoked" | "http";

export class HubError extends Error {
  constructor(public kind: HubErrorKind, public status: number, public detail: string) {
    super(detail);
  }
}

type FetchFn = (url: string, init: any) => Promise<any>;

export type PushOp = {
  operation_id: string;
  entity: "client" | "license";
  action: "create" | "update" | "delete";
  data: Record<string, any>;
  client_timestamp?: string;
};
export type PushResult = { operation_id: string; entity: string; entity_id: string; status: string; message: string };
export type PushResponse = {
  sync_batch_id: string;
  summary: Record<string, number>;
  results: PushResult[];
};

const cleanUrl = (u: string) => u.trim().replace(/\/+$/, "");

function detailOf(body: any, fallback: string): string {
  const d = body?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => x?.msg ?? JSON.stringify(x)).join("; ");
  return fallback;
}

export class HubClient {
  private refreshing: Promise<boolean> | null = null;

  constructor(
    private sessions: SessionStorage,
    private opts: { fetchFn?: FetchFn; timeoutMs?: number } = {}
  ) {}

  private fetchFn(): FetchFn {
    return this.opts.fetchFn ?? ((u, i) => fetch(u, i));
  }

  private async raw(method: string, url: string, headers: Record<string, string>, body?: unknown) {
    const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), this.opts.timeoutMs ?? HTTP_TIMEOUT_MS) : null;
    try {
      const res = await this.fetchFn()(url, {
        method,
        headers: { Accept: "application/json", ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: ctl?.signal,
      });
      let json: any = null;
      try {
        json = await res.json();
      } catch {}
      return { status: res.status as number, ok: !!res.ok, json };
    } catch (e: any) {
      throw new HubError("network", 0, e?.name === "AbortError" ? "Server ne waqt par jawab nahi diya" : "Internet / server se rabta nahi ho saka");
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async doRefresh(): Promise<boolean> {
    const s = await this.sessions.load();
    if (!s?.refreshToken) return false;
    const r = await this.raw("POST", `${cleanUrl(s.baseUrl)}/api/v1/auth/refresh`, {}, { refresh_token: s.refreshToken });
    if (!r.ok || !r.json?.access_token) return false;
    await this.sessions.save({ ...s, accessToken: r.json.access_token, refreshToken: r.json.refresh_token ?? s.refreshToken });
    return true;
  }
  private refresh(): Promise<boolean> {
    if (!this.refreshing) this.refreshing = this.doRefresh().finally(() => (this.refreshing = null));
    return this.refreshing;
  }

  async request<T = any>(method: string, path: string, body?: unknown, opts: { device?: boolean } = { device: true }): Promise<T> {
    for (let attempt = 0; attempt < 2; attempt++) {
      const s = await this.sessions.load();
      if (!s) throw new HubError("auth", 401, "Pehle Hub mein login karein");
      const headers: Record<string, string> = { Authorization: `Bearer ${s.accessToken}` };
      if (opts.device !== false) headers["X-Device-Id"] = s.deviceId;
      const r = await this.raw(method, `${cleanUrl(s.baseUrl)}${path}`, headers, body);
      if (r.status === 401 && attempt === 0) {
        if (await this.refresh()) continue;
        throw new HubError("auth", 401, "Session khatam ho gaya, dobara login karein");
      }
      if (r.ok) return r.json as T;
      const detail = detailOf(r.json, `Server error (${r.status})`);
      if (r.status === 401) throw new HubError("auth", 401, detail);
      if (r.status === 403 && /revoked/i.test(detail)) throw new HubError("revoked", 403, detail);
      throw new HubError("http", r.status, detail);
    }
    throw new HubError("auth", 401, "Session khatam ho gaya, dobara login karein");
  }

  // ---- login ----
  async login(args: { baseUrl: string; username: string; password: string; deviceId: string; deviceName: string; appVersion: string }) {
    const base = cleanUrl(args.baseUrl);
    if (!/^https?:\/\//i.test(base)) throw new HubError("http", 0, "Hub URL https:// se shuru hona chahiye");
    const r = await this.raw("POST", `${base}/api/v1/auth/token`, {}, { username: args.username.trim(), password: args.password });
    if (r.status === 401 || r.status === 400) throw new HubError("auth", r.status, detailOf(r.json, "Username ya password ghalat hai"));
    if (r.status === 429) throw new HubError("http", 429, detailOf(r.json, "Bohat zyada koshishen, 1 minute baad dobara karein"));
    if (!r.ok || !r.json?.access_token) throw new HubError("http", r.status, detailOf(r.json, `Login fail (${r.status})`));
    await this.sessions.save({
      baseUrl: base,
      accessToken: r.json.access_token,
      refreshToken: r.json.refresh_token ?? "",
      username: args.username.trim().toLowerCase(),
      deviceId: args.deviceId,
      deviceName: args.deviceName,
    });
    try {
      await this.request("POST", "/api/v1/generator/devices/register", {
        device_id: args.deviceId,
        device_name: args.deviceName,
        platform: "apk",
        app_version: args.appVersion,
      });
    } catch (e) {
      await this.sessions.clear();
      throw e;
    }
  }

  async deviceId(): Promise<string> {
    return (await this.sessions.load())?.deviceId ?? "";
  }

  async logout() {
    await this.sessions.clear();
  }

  // ---- generator endpoints ----
  bootstrap() {
    return this.request<any>("GET", "/api/v1/generator/bootstrap");
  }
  push(deviceId: string, batchId: string, operations: PushOp[]) {
    return this.request<PushResponse>("POST", "/api/v1/generator/sync/push", { device_id: deviceId, sync_batch_id: batchId, operations });
  }
  pull(updatedSince: string | null, offset: number, limit = 200) {
    const q = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (updatedSince) q.set("updated_since", updatedSince);
    return this.request<any>("GET", `/api/v1/generator/sync/pull?${q.toString()}`);
  }
  // Used only when /sync/pull does not carry releases yet (older Hub).
  releases() {
    return this.request<any[]>("GET", "/api/v1/admin/releases", undefined, { device: false });
  }
}
