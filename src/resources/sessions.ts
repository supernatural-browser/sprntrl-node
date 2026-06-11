import { APIResource } from "../core/resource.js";
import { SprntrlError } from "../core/error.js";
import { SessionFiles } from "./session-files.js";
import { SessionExtensions } from "./session-extensions.js";
import type {
  ExtensionInlineSpec,
  LocationOptions,
  OS,
  PaginatedSessions,
  ProxyConfig,
  Session,
} from "../types.js";
import type { Sprntrl } from "../client.js";

export interface SessionCreateParams {
  os: OS;
  location: string;
  /**
   * Pin the proxy-pool match to a specific labeled row at `location` — one
   * of the labels surfaced by `listLocations()` (e.g. "Kentucky, US").
   * Ignored for BYO-proxy sessions.
   */
  label?: string;
  persistent?: boolean;
  captcha_solver?: boolean;
  /**
   * Run automation in a V8 isolated world hidden from the page (default: true).
   * Leave unset to use the platform default. Set to `false` only when you must
   * read page-defined JavaScript globals or call functions the page exposes on
   * `window.*` — main-world execution is visible to anti-bot detection.
   */
  isolated_world?: boolean;
  /**
   * Launch Chrome in headless mode (`--headless=new`). Default: `true`.
   * Pass `false` if you also want a live viewer of the session
   * (e.g. for human-assisted debugging). The browser is reachable over
   * CDP either way.
   */
  headless?: boolean;
  /**
   * Disable image loading for the session (`--blink-settings=imagesEnabled=false`).
   * Default: `false`. Speeds up loads and cuts bandwidth on image-heavy sites.
   */
  block_images?: boolean;
  session_name?: string;
  proxy?: string | ProxyConfig;
  /**
   * Chrome extensions to load at launch. Only respected for ephemeral
   * sessions (persistent profiles manage extensions via
   * `client.sessions.extensions.*`). Each entry uses exactly one source:
   * `{ uploadB64, filename? }`, `{ webstoreUrl }`, or `{ crxUrl }`.
   */
  extensions?: ExtensionInlineSpec[];
}

export interface SessionResumeParams {
  /**
   * Override the profile's OS. Changing it rebuilds the pinned fingerprint —
   * the profile's identity intentionally drifts from this resume on.
   */
  os?: OS;
  /**
   * Override the profile's location. Changing it rebuilds the pinned
   * fingerprint (same one-time identity drift as `os`); on a pool session it
   * also re-assigns a pool proxy for the new region.
   */
  location?: string;
  /**
   * Re-pin the pool match to a specific labeled row at the (possibly new)
   * location — one of the labels from `listLocations()`. Pass an empty
   * string to clear the stored label (match any pool row at the location);
   * omit to keep it.
   */
  label?: string;
  captcha_solver?: boolean;
  /** See `SessionCreateParams.isolated_world`. Omit to keep the stored value. */
  isolated_world?: boolean;
  /** See `SessionCreateParams.headless`. Omit to keep the stored value. */
  headless?: boolean;
  /** See `SessionCreateParams.block_images`. Omit to keep the stored value. */
  block_images?: boolean;
  /**
   * Switch to a different BYO proxy for this and future resumes. Supplying a
   * proxy also switches a pool session to BYO; switching a BYO session back
   * to a pool proxy is not supported — delete and recreate the profile.
   */
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
  extensions: SessionExtensions;

  constructor(client: Sprntrl) {
    super(client);
    this.files = new SessionFiles(client);
    this.extensions = new SessionExtensions(client);
  }

  create(params: SessionCreateParams): Promise<Session> {
    const {
      os,
      location,
      label,
      persistent = false,
      captcha_solver,
      isolated_world,
      headless,
      block_images,
      session_name,
      proxy,
      extensions,
    } = params;
    const body: Record<string, unknown> = { os, location, persistent };
    if (label !== undefined) body.label = label;
    if (captcha_solver) body.captcha_solver = true;
    if (isolated_world !== undefined) body.isolated_world = isolated_world;
    if (headless !== undefined) body.headless = headless;
    if (block_images) body.block_images = true;
    if (session_name !== undefined) body.session_name = session_name;
    Object.assign(body, normalizeProxy(proxy));
    if (extensions && extensions.length > 0) {
      body.extensions = extensions.map((e) => ({
        upload_b64: e.uploadB64,
        filename: e.filename,
        webstore_url: e.webstoreUrl,
        crx_url: e.crxUrl,
      }));
    }
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

  /**
   * Location options for `create`/`resume`. Pool-proxy sessions must pick a
   * `location` (and optionally `label`) from `options`; `accepts_iana: true`
   * means BYO-proxy sessions may instead pass any IANA timezone
   * (see `iana_examples`) as `location`.
   */
  listLocations(): Promise<LocationOptions> {
    return this._client.request<LocationOptions>({
      method: "GET",
      path: "/api/v1/sessions/locations",
    });
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

  /**
   * Resume a stopped persistent session. Every option is an override —
   * omitted fields keep the values stored on the session. Changing `os` or
   * `location` rebuilds the pinned fingerprint (an intentional one-time
   * identity drift); changing `location` on a pool session also re-assigns
   * the pool proxy for the new region. Supplying `proxy` switches a pool
   * session to BYO — BYO back to pool is not supported (delete + recreate).
   */
  resume(sessionId: string, options: SessionResumeParams = {}): Promise<Session> {
    const { os, location, label, captcha_solver, isolated_world, headless, block_images, proxy } =
      options;
    const body: Record<string, unknown> = {};
    if (os !== undefined) body.os = os;
    if (location !== undefined) body.location = location;
    if (label !== undefined) body.label = label;
    if (captcha_solver !== undefined) body.captcha_solver = captcha_solver;
    if (isolated_world !== undefined) body.isolated_world = isolated_world;
    if (headless !== undefined) body.headless = headless;
    if (block_images !== undefined) body.block_images = block_images;
    Object.assign(body, normalizeProxy(proxy));
    return this._client.request<Session>({
      method: "POST",
      path: `/api/v1/sessions/${encodeURIComponent(sessionId)}/resume`,
      body: Object.keys(body).length > 0 ? body : undefined,
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
