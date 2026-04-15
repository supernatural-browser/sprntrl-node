import { APIResource } from "../core/resource.js";
import type { Template } from "../types.js";

export class Templates extends APIResource {
  async list(): Promise<Template[]> {
    const r = await this._client.request<{ templates: Template[] }>({
      method: "GET",
      path: "/api/v1/templates",
    });
    return r.templates ?? [];
  }
}
