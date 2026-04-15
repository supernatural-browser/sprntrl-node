import { APIResource } from "../core/resource.js";
import type { Usage as UsageModel, UsageMonth } from "../types.js";

export class Usage extends APIResource {
  current(): Promise<UsageModel> {
    return this._client.request<UsageModel>({
      method: "GET",
      path: "/api/v1/usage",
    });
  }

  async history(): Promise<UsageMonth[]> {
    const r = await this._client.request<{ months: UsageMonth[] }>({
      method: "GET",
      path: "/api/v1/usage/history",
    });
    return r.months ?? [];
  }
}
