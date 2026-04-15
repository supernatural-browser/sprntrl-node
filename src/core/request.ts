import {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  errorForStatus,
} from "./error.js";

export interface RequestConfig {
  apiKey: string;
  baseURL: string;
  timeout: number;
  maxRetries: number;
  defaultHeaders: Record<string, string>;
  fetch?: typeof fetch;
}

export interface RequestOptions {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
  /** If body is FormData/Blob/ArrayBuffer, don't set content-type/JSON-encode. */
  rawBody?: boolean;
  /** If true, return the raw Response (for binary downloads). */
  stream?: boolean;
  signal?: AbortSignal;
  /** Per-request override. */
  timeout?: number;
  maxRetries?: number;
}

const USER_AGENT = "sprntrl-node/0.1.0";

function buildURL(baseURL: string, path: string, query?: RequestOptions["query"]): string {
  const url = path.startsWith("http") ? new URL(path) : new URL(path, baseURL);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

function shouldRetry(status: number | null): boolean {
  if (status === null) return true;
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

function backoff(attempt: number): number {
  const base = 500 * 2 ** attempt;
  return base + Math.floor(Math.random() * 250);
}

async function parseError(response: Response): Promise<{ message: string; body: unknown }> {
  let body: unknown;
  try {
    body = await response.clone().json();
  } catch {
    body = await response.clone().text().catch(() => undefined);
  }
  let message: string | undefined;
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    message = (b.error as string) || (b.message as string) || (b.detail as string);
  }
  return { message: message ?? `HTTP ${response.status}`, body };
}

export async function request<T = unknown>(
  config: RequestConfig,
  opts: RequestOptions,
): Promise<T> {
  const url = buildURL(config.baseURL, opts.path, opts.query);
  const headers: Record<string, string> = {
    Authorization: `ApiKey ${config.apiKey}`,
    Accept: "application/json",
    "User-Agent": USER_AGENT,
    ...config.defaultHeaders,
    ...(opts.headers ?? {}),
  };

  let init: RequestInit = { method: opts.method, headers };
  if (opts.body !== undefined) {
    if (opts.rawBody) {
      init.body = opts.body as BodyInit;
    } else {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(opts.body);
    }
  }

  const fetchFn = config.fetch ?? fetch;
  const timeout = opts.timeout ?? config.timeout;
  const maxRetries = opts.maxRetries ?? config.maxRetries;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error("timeout")), timeout);
    const signal = opts.signal
      ? AbortSignal.any([opts.signal, controller.signal])
      : controller.signal;

    try {
      const response = await fetchFn(url, { ...init, signal });
      clearTimeout(timer);

      if (response.ok) {
        if (opts.stream) return response as unknown as T;
        if (response.status === 204) return undefined as T;
        const ctype = response.headers.get("content-type") ?? "";
        if (ctype.includes("application/json")) return (await response.json()) as T;
        return (await response.arrayBuffer()) as unknown as T;
      }

      if (shouldRetry(response.status) && attempt < maxRetries) {
        await sleep(backoff(attempt));
        continue;
      }
      const { message, body } = await parseError(response);
      throw errorForStatus(response.status, message, body, response.headers);
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof APIError) throw err;
      // network/abort
      const isTimeout = (err as { name?: string })?.name === "AbortError";
      lastErr = isTimeout
        ? new APIConnectionTimeoutError()
        : new APIConnectionError(
            err instanceof Error ? err.message : "Connection error",
            { cause: err },
          );
      if (attempt < maxRetries) {
        await sleep(backoff(attempt));
        continue;
      }
      throw lastErr;
    }
  }
  throw lastErr;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
