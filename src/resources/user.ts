import { APIResource } from "../core/resource.js";
import type { User as UserModel } from "../types.js";

export interface UserSettings {
  /** Allow accruing hours-overage charges past the plan allowance. */
  allow_hours_overage?: boolean;
  /** Restrict the account to BYO proxies only (no pool proxy). */
  byo_proxy_only?: boolean;
}

export interface ChangePasswordResult {
  message: string;
  /** Fresh tokens — issued so a programmatic client can swap credentials
   * without a re-login. Absent for cookie/session-only flows. */
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
}

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

  /** Read the account settings (same shape as `me()`). */
  getSettings(): Promise<UserModel> {
    return this._client.request<UserModel>({
      method: "GET",
      path: "/api/v1/user/me/settings",
    });
  }

  updateSettings(fields: UserSettings): Promise<UserModel> {
    return this._client.request<UserModel>({
      method: "PUT",
      path: "/api/v1/user/me/settings",
      body: fields,
    });
  }

  changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<ChangePasswordResult> {
    return this._client.request<ChangePasswordResult>({
      method: "PUT",
      path: "/api/v1/user/change-password",
      body: { current_password: currentPassword, new_password: newPassword },
    });
  }
}
