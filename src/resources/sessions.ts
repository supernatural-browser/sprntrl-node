import { APIResource } from "../core/resource.js";
import { SprntrlError } from "../core/error.js";
import { SessionFiles } from "./session-files.js";
import type {
  OS,
  PaginatedSessions,
  ProxyConfig,
  Session,
} from "../types.js";
import type { Sprntrl } from "../client.js";

export interface SessionCreateParams {
  os: OS;
  location: string;
  persistent?: boolean;
  captcha_solver?: boolean;
  session_name?: string;
  proxy?: string | ProxyConfig;
}

export interface ConnectOptions {
  /** Currently 'playwright' or 'puppeteer'. */
  framework?: "playwright" | "puppeteer";
  /** Add the caller's current IP to the account whitelist before connecting. */
  autoWhitelist?: boolean;
  /** Wait for session status 'running' before connecting (default true). */
  wait?: boolean;
  /** Timeout in ms for wait_until_ready (default 60000). */
  waitTimeout?: number;
}

function normalizeProxy(
  proxy: string | ProxyConfig | undefined,
): Record<string, string | number> {
  if (!proxy) return {};
  if (typeof proxy === "string") {
    const url = new URL(proxy);
    const out: Record<string, string | number> = {
      proxy_protocol: url.protocol.replace(":", "").toUpperCase(),
      proxy_host: url.hostname,
    };
    if (url.port) out.proxy_port = Number(url.port);
    if (url.username) out.proxy_username = decodeURIComponent(url.username);
    if (url.password) out.proxy_password = decodeURIComponent(url.password);
    return out;
  }
  const out: Record<string, string | number> = {};
  if (proxy.protocol) out.proxy_protocol = proxy.protocol.toUpperCase();
  if (proxy.host) out.proxy_host = proxy.host;
  if (proxy.port !== undefined) out.proxy_port = proxy.port;
  if (proxy.username !== undefined) out.proxy_username = proxy.username;
  if (proxy.password !== undefined) out.proxy_password = proxy.password;
  return out;
}

export class Sessions extends APIResource {
  files: SessionFiles;

  constructor(client: Sprntrl) {
    super(client);
    this.files = new SessionFiles(client);
  }

  create(params: SessionCreateParams): Promise<Session> {
    const { os, location, persistent = false, captcha_solver, session_name, proxy } = params;
    const body: Record<string, unknown> = { os, location, persistent };
    if (captcha_solver) body.captcha_solver = true;
    if (session_name !== undefined) body.session_name = session_name;
    Object.assign(body, normalizeProxy(proxy));
    return this._client.request<Session>({
      method: "POST",
      path: "/api/v1/sessions",
      body,
    });
  }

  async list(): Promise<Session[]> {
    const r = await this._client.request<{ sessions: Session[] }>({
      method: "GET",
      path: "/api/v1/sessions",
    });
    return r.sessions ?? [];
  }

  async listActive(): Promise<Session[]> {
    const r = await this._client.request<{ sessions: Session[] }>({
      method: "GET",
      path: "/api/v1/sessions/active",
    });
    return r.sessions ?? [];
  }

  listHistory(params: { page?: number; perPage?: number } = {}): Promise<PaginatedSessions> {
    return this._client.request<PaginatedSessions>({
      method: "GET",
      path: "/api/v1/sessions/history",
      query: { page: params.page ?? 1, per_page: params.perPage ?? 25 },
    });
  }

  async listResumable(params: { limit?: number } = {}): Promise<Session[]> {
    const r = await this._client.request<{ sessions: Session[] }>({
      method: "GET",
      path: "/api/v1/sessions/resumable",
      query: { limit: params.limit ?? 10 },
    });
    return r.sessions ?? [];
  }

  /** Persistent sessions (those created with `persistent: true`), whether
   * currently running or stopped-but-resumable. */
  async listPersistent(): Promise<Session[]> {
    const r = await this._client.request<{ sessions: Session[] }>({
      method: "GET",
      path: "/api/v1/sessions/persistent",
    });
    return r.sessions ?? [];
  }

  async listLocations(): Promise<string[]> {
    const r = await this._client.request<{ locations: string[] }>({
      method: "GET",
      path: "/api/v1/sessions/locations",
    });
    return r.locations ?? [];
  }

  get(sessionId: string): Promise<Session> {
    return this._client.request<Session>({
      method: "GET",
      path: `/api/v1/sessions/${encodeURIComponent(sessionId)}`,
    });
  }

  async stop(sessionId: string): Promise<void> {
    await this._client.request({
      method: "DELETE",
      path: `/api/v1/sessions/${encodeURIComponent(sessionId)}`,
    });
  }

  resume(sessionId: string): Promise<Session> {
    return this._client.request<Session>({
      method: "POST",
      path: `/api/v1/sessions/${encodeURIComponent(sessionId)}/resume`,
    });
  }

  async deletePersistent(sessionId: string): Promise<void> {
    await this._client.request({
      method: "DELETE",
      path: `/api/v1/sessions/${encodeURIComponent(sessionId)}/persist`,
    });
  }

  async waitUntilReady(
    sessionId: string,
    opts: { timeout?: number; pollInterval?: number } = {},
  ): Promise<Session> {
    const timeout = opts.timeout ?? 60_000;
    const pollInterval = opts.pollInterval ?? 500;
    const deadline = Date.now() + timeout;
    while (true) {
      const session = await this.get(sessionId);
      if (session.status === "running") return session;
      if (
        session.status === "failed" ||
        session.status === "stopped" ||
        session.status === "stopping"
      ) {
        throw new SprntrlError(
          `Session ${sessionId} entered status '${session.status}' while waiting`,
        );
      }
      if (Date.now() >= deadline) {
        throw new SprntrlError(
          `Session ${sessionId} not ready after ${timeout}ms (status='${session.status}')`,
        );
      }
      await new Promise((r) => setTimeout(r, pollInterval));
    }
  }

  async connect(sessionId: string, opts: ConnectOptions = {}): Promise<unknown> {
    const { connect } = await import("../lib/browser.js");
    const session =
      opts.wait !== false
        ? await this.waitUntilReady(sessionId, { timeout: opts.waitTimeout })
        : await this.get(sessionId);
    return connect(this._client, session, {
      framework: opts.framework ?? "playwright",
      autoWhitelist: opts.autoWhitelist ?? false,
    });
  }

  /**
   * Build the CDP WebSocket URL for a session. Useful for handing off to any
   * CDP client (chrome-remote-interface, raw ws, etc.) — Playwright and
   * Puppeteer users should use `connect()` or `browserSession()` instead.
   */
  cdpUrl(sessionId: string): string {
    const base = new URL(this._client.baseURL);
    const scheme = base.protocol === "https:" ? "wss:" : "ws:";
    return `${scheme}//${base.host}/api/v1/sessions/${encodeURIComponent(sessionId)}/cdp`;
  }

  /**
   * Connect a browser, hand back a disposable handle. Exit cleanup closes the
   * browser (does not stop the session — caller owns that).
   *
   *   await using handle = await client.sessions.browserSession(id, { autoWhitelist: true });
   *   const page = await handle.browser.newPage();
   *
   * Without `await using` (Node <20.11 or TS <5.2):
   *   const handle = await client.sessions.browserSession(id);
   *   try { ... } finally { await handle.close(); }
   */
  async browserSession(sessionId: string, opts: ConnectOptions = {}): Promise<BrowserHandle> {
    const browser = (await this.connect(sessionId, opts)) as BrowserLike;
    let closed = false;
    const close = async () => {
      if (closed) return;
      closed = true;
      try {
        await browser.close();
      } catch {
        // best-effort
      }
    };
    const handle = {
      browser,
      close,
      [Symbol.asyncDispose]: close,
    } as BrowserHandle;
    return handle;
  }
}

interface BrowserLike {
  close(): Promise<void>;
}

export interface BrowserHandle {
  readonly browser: unknown; // Playwright Browser or Puppeteer Browser
  close(): Promise<void>;
  [Symbol.asyncDispose](): Promise<void>;
}
