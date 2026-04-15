import { APIResource } from "../core/resource.js";
import type { IPWhitelistEntry } from "../types.js";

export class IPWhitelist extends APIResource {
  async list(): Promise<IPWhitelistEntry[]> {
    const r = await this._client.request<{ entries: IPWhitelistEntry[] }>({
      method: "GET",
      path: "/api/v1/settings/ip-whitelist",
    });
    return r.entries ?? [];
  }

  /** Pass ip='current' to register the caller's public IP (as Cloudflare sees it). */
  add(ip: string = "current", opts: { label?: string } = {}): Promise<IPWhitelistEntry> {
    const body: Record<string, unknown> = { ip };
    if (opts.label !== undefined) body.label = opts.label;
    return this._client.request<IPWhitelistEntry>({
      method: "POST",
      path: "/api/v1/settings/ip-whitelist",
      body,
    });
  }

  async remove(entryId: string): Promise<void> {
    await this._client.request({
      method: "DELETE",
      path: `/api/v1/settings/ip-whitelist/${encodeURIComponent(entryId)}`,
    });
  }
}
