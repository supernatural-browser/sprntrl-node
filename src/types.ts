export type ProxyProtocol = "HTTP" | "HTTPS" | "SOCKS5";
export type SessionStatus =
  | "creating"
  | "running"
  | "stopping"
  | "stopped"
  | "failed"
  | "archiving";
export type OS = "macos" | "windows";

export interface ProxyConfig {
  protocol?: ProxyProtocol;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
}

/**
 * Flattened, display-friendly view of the proxy attached to a session.
 * Only present for BYO (bring-your-own) proxies — pool proxies are shared
 * infra and the API deliberately hides their host/port. The password is
 * never returned.
 */
export interface ProxySummary {
  protocol: string;
  host: string;
  port: number;
  username?: string;
  /** Convenience form: `protocol://host:port`. */
  address: string;
}

export interface Session {
  id: string;
  user_id: string;
  profile_id?: string | null;
  container_id?: string | null;
  chrome_port?: number | null;
  status: SessionStatus;
  persistent: boolean;
  captcha_solver: boolean;
  session_name?: string | null;
  data_dir_path?: string | null;
  data_dir_size: number;
  storage_status: string;
  os: OS;
  location: string;
  started_at?: string | null;
  stopped_at?: string | null;
  created_at: string;
  cdp_url?: string;
  uptime_seconds: number;
  sidecar_port?: number;
  /** Present only for BYO-proxy sessions. */
  proxy?: ProxySummary;
}

export interface PaginatedSessions {
  sessions: Session[];
  total: number;
  page: number;
  per_page: number;
}

/**
 * One entry in the location picker. `location` is an IANA timezone (it
 * drives the browser's timezone); `label` is the human-readable region the
 * pool serves there (e.g. "Kentucky, US") — null on unlabeled rows. Pass
 * both back to `sessions.create` to pin the pool match to that slice.
 */
export interface LocationOption {
  location: string;
  label: string | null;
}

/**
 * Response of `sessions.listLocations()`. Pool-proxy sessions must pick
 * from `options`; `accepts_iana: true` means BYO-proxy sessions may instead
 * pass any IANA timezone (see `iana_examples`) as `location`.
 */
export interface LocationOptions {
  options: LocationOption[];
  accepts_iana: boolean;
  iana_examples?: string[];
}

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  os?: string | null;
  location?: string | null;
  persona?: string | null;
  config_json: unknown;
  template_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Template {
  id: string;
  name: string;
  os: string;
  config: unknown;
}

export interface IPWhitelistEntry {
  id: string;
  user_id: string;
  ip_address: string;
  label?: string | null;
  created_at: string;
}

export interface APIKey {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at?: string | null;
  created_at: string;
  revoked_at?: string | null;
}

export interface APIKeyCreated extends APIKey {
  /** Returned ONLY once at creation time. Store it immediately. */
  key: string;
}

export interface Usage {
  total_minutes: number;
  plan_minutes: number;
  overage_minutes: number;
  month: string;
  plan: string;
  usage_percentage: number;
  allow_hours_overage: boolean;
  /** Present when the plan exposes a profile cap. */
  profile_count?: number;
  max_profiles?: number;
  /** Pool-proxy bandwidth, cents per GB. */
  bandwidth_rate_cents?: number;
  /** Charge per hour over the plan's included minutes, in cents. */
  hours_overage_rate_cents?: number;
  /** Bytes of pool-proxy bandwidth consumed this period. */
  bandwidth_bytes?: number;
  /** Accrued bandwidth overage charge this period, in cents. */
  bandwidth_charge_amount_cents?: number;
  /** Minutes used beyond the plan allowance this period. */
  hours_overage_minutes?: number;
  /** Accrued hours-overage charge this period, in cents. */
  hours_overage_amount_cents?: number;
}

export interface UsageMonth {
  month: string;
  total_minutes: number;
  plan_minutes: number;
  overage_minutes: number;
}

export type AccountStatus =
  | "pending_verification"
  | "pending_payment"
  | "active";

export interface User {
  id: string;
  email: string;
  name?: string | null;
  plan: string;
  role: string;
  allow_hours_overage: boolean;
  /** When true, the account may only use BYO proxies (no pool proxy). */
  byo_proxy_only: boolean;
  /** Pool-proxy bandwidth, cents per GB. */
  bandwidth_rate_cents: number;
  /** Charge per hour over the plan's included minutes, in cents. */
  hours_overage_rate_cents: number;
  must_change_password: boolean;
  email_verified: boolean;
  account_status: AccountStatus;
  /** Set for OAuth signups ("google" | "github"); absent for password accounts. */
  oauth_provider?: string;
  created_at: string;
}

export interface FileInfo {
  name: string;
  size: number;
  modified?: string;
}

/**
 * One Chrome extension attached to a persistent session's profile.
 * Extensions live in storage keyed by (user_id, session_name, extension_id);
 * the dashboard, API, and SDK all show the same view.
 */
export interface SessionExtension {
  /** Internal UUID — pass to update()/remove(). */
  id: string;
  user_id: string;
  session_name: string;
  /** 32-char Chromium-style extension ID derived from the manifest key. */
  extension_id: string;
  name: string;
  version: string;
  manifest_version: number;
  permissions: string[];
  host_permissions: string[];
  source: "upload" | "webstore" | "crx_url";
  source_ref?: string | null;
  size_bytes: number;
  sha256: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Inline extension spec for ephemeral sessions — set exactly one of
 * uploadB64, webstoreUrl, or crxUrl. Persistent sessions ignore the
 * `extensions` field on create; manage them through
 * `client.sessions.extensions.*` instead.
 */
export interface ExtensionInlineSpec {
  /** Base64-encoded ZIP or CRX bytes (up to 50 MiB after decode). */
  uploadB64?: string;
  filename?: string;
  /** Chrome Web Store detail-page URL, or bare 32-char extension ID. */
  webstoreUrl?: string;
  /** Direct URL to a .crx or .zip blob. HTTPS, public IPs only. */
  crxUrl?: string;
}

/**
 * One of upload (Buffer/Blob), webstoreUrl, or crxUrl is required.
 * Persistent-session-only: use `extensions` on `sessions.create` for
 * ephemeral sessions instead.
 */
export interface ExtensionAddParams {
  upload?: Uint8Array | Blob;
  filename?: string;
  webstoreUrl?: string;
  crxUrl?: string;
}
