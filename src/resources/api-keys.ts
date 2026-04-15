import { APIResource } from "../core/resource.js";
import type { APIKey, APIKeyCreated } from "../types.js";

export class APIKeys extends APIResource {
  async list(): Promise<APIKey[]> {
    const r = await this._client.request<{ api_keys: APIKey[] }>({
      method: "GET",
      path: "/api/v1/apikeys",
    });
    return r.api_keys ?? [];
  }

  /**
   * Create an API key. The full `key` field is returned ONLY on creation —
   * store it immediately; the server cannot show it again.
   */
  create(name: string): Promise<APIKeyCreated> {
    return this._client.request<APIKeyCreated>({
      method: "POST",
      path: "/api/v1/apikeys",
      body: { name },
    });
  }

  async revoke(keyId: string): Promise<void> {
    await this._client.request({
      method: "DELETE",
      path: `/api/v1/apikeys/${encodeURIComponent(keyId)}`,
    });
  }
}
