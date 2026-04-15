import { APIResource } from "../core/resource.js";
import type { User as UserModel } from "../types.js";

export class User extends APIResource {
  me(): Promise<UserModel> {
    return this._client.request<UserModel>({
      method: "GET",
      path: "/api/v1/user/me",
    });
  }

  update(fields: { name?: string }): Promise<UserModel> {
    return this._client.request<UserModel>({
      method: "PUT",
      path: "/api/v1/user/me",
      body: fields,
    });
  }

  updateSettings(fields: Record<string, unknown>): Promise<UserModel> {
    return this._client.request<UserModel>({
      method: "PUT",
      path: "/api/v1/user/me/settings",
      body: fields,
    });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this._client.request({
      method: "PUT",
      path: "/api/v1/user/change-password",
      body: { current_password: currentPassword, new_password: newPassword },
    });
  }
}
