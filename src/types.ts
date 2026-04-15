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

export interface Session {
  id: string;
  user_id: string;
  profile_id?: string | null;
  container_id?: string | null;
  chrome_port?: number | null;
  status: SessionStatus;
  persistent: boolean;
  session_name?: string | null;
  data_dir_path?: string | null;
  data_dir_size: number;
  storage_status: string;
  os: OS;
  location: string;
  proxy_protocol?: string | null;
  proxy_host?: string | null;
  proxy_port?: number | null;
  proxy_username?: string | null;
  started_at?: string | null;
  stopped_at?: string | null;
  created_at: string;
  cdp_url?: string;
  uptime_seconds?: number;
  sidecar_port?: number;
}

export interface PaginatedSessions {
  sessions: Session[];
  total: number;
  page: number;
  per_page: number;
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
  usage_percentage?: number;
  profile_count?: number;
  max_profiles?: number;
  bandwidth_bytes?: number;
  bandwidth_limit_gb?: number;
  bandwidth_overage_rate_cents?: number;
  allow_bandwidth_overage?: boolean;
  bandwidth_overage_bytes?: number;
  bandwidth_overage_amount_cents?: number;
}

export interface UsageMonth {
  month: string;
  total_minutes: number;
  plan_minutes: number;
  overage_minutes: number;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  plan: string;
  role: string;
  byo_proxy?: boolean;
  allow_bandwidth_overage?: boolean;
  bandwidth_overage_rate_cents?: number;
  created_at: string;
}

export interface FileInfo {
  name: string;
  size: number;
  modified?: string;
}
