import { APIResource } from "../core/resource.js";
import type { Profile } from "../types.js";

export interface ProfileCreateParams {
  name: string;
  template_id?: string;
  config?: unknown;
  description?: string;
  os?: string;
  location?: string;
  persona?: string;
}

export class Profiles extends APIResource {
  create(params: ProfileCreateParams): Promise<Profile> {
    const { config, ...rest } = params;
    const body: Record<string, unknown> = { ...rest };
    if (config !== undefined) body.config_json = config;
    return this._client.request<Profile>({
      method: "POST",
      path: "/api/v1/profiles",
      body,
    });
  }

  async list(): Promise<Profile[]> {
    const r = await this._client.request<{ profiles: Profile[] }>({
      method: "GET",
      path: "/api/v1/profiles",
    });
    return r.profiles ?? [];
  }

  get(profileId: string): Promise<Profile> {
    return this._client.request<Profile>({
      method: "GET",
      path: `/api/v1/profiles/${encodeURIComponent(profileId)}`,
    });
  }

  update(profileId: string, fields: Partial<ProfileCreateParams>): Promise<Profile> {
    const { config, ...rest } = fields;
    const body: Record<string, unknown> = { ...rest };
    if (config !== undefined) body.config_json = config;
    return this._client.request<Profile>({
      method: "PUT",
      path: `/api/v1/profiles/${encodeURIComponent(profileId)}`,
      body,
    });
  }

  duplicate(profileId: string): Promise<Profile> {
    return this._client.request<Profile>({
      method: "POST",
      path: `/api/v1/profiles/${encodeURIComponent(profileId)}/duplicate`,
    });
  }

  async delete(profileId: string): Promise<void> {
    await this._client.request({
      method: "DELETE",
      path: `/api/v1/profiles/${encodeURIComponent(profileId)}`,
    });
  }
}
