import { APIResource } from "../core/resource.js";
import type { ExtensionAddParams, SessionExtension } from "../types.js";

/**
 * Manage Chrome extensions attached to a persistent session's profile.
 *
 * Extensions are loaded at Chrome launch via `--load-extension`, so
 * adding / removing / toggling an extension takes effect on the **next**
 * session start, not the running one. Stop and resume the session to
 * apply changes.
 *
 * For ephemeral sessions, pass the `extensions` field to
 * `client.sessions.create()` instead — the management endpoints below
 * only apply to persistent sessions.
 */
export class SessionExtensions extends APIResource {
  /** List extensions installed on the persistent session's profile. */
  async list(sessionId: string): Promise<SessionExtension[]> {
    const r = await this._client.request<{ extensions: SessionExtension[]; count: number }>({
      method: "GET",
      path: `/api/v1/sessions/${encodeURIComponent(sessionId)}/extensions`,
    });
    return r.extensions ?? [];
  }

  /**
   * Install or replace an extension on a persistent session's profile.
   * Provide exactly one of `upload`, `webstoreUrl`, or `crxUrl`:
   *
   * - `upload`: raw ZIP or CRX bytes (Uint8Array or Blob). Up to 50 MiB.
   *   Sent as multipart so it doesn't blow the JSON body limit.
   * - `webstoreUrl`: a chromewebstore.google.com detail URL or the bare
   *   32-char extension ID. We fetch the CRX server-side via Google's
   *   update endpoint.
   * - `crxUrl`: any HTTPS URL to a `.crx` or `.zip`. Resolves only to
   *   public IPs (no SSRF to internal services).
   */
  async add(sessionId: string, params: ExtensionAddParams): Promise<SessionExtension> {
    const sources = [params.upload, params.webstoreUrl, params.crxUrl].filter(Boolean).length;
    if (sources !== 1) {
      throw new Error("Provide exactly one of: upload, webstoreUrl, crxUrl");
    }
    const path = `/api/v1/sessions/${encodeURIComponent(sessionId)}/extensions`;
    if (params.upload) {
      const form = new FormData();
      const blob =
        params.upload instanceof Blob
          ? params.upload
          : new Blob([params.upload as BlobPart], { type: "application/octet-stream" });
      form.append("file", blob, params.filename ?? "extension.zip");
      return this._client.request<SessionExtension>({
        method: "POST",
        path,
        body: form,
        rawBody: true,
      });
    }
    const body: Record<string, string> = {};
    if (params.webstoreUrl) {
      body.source = "webstore";
      body.url = params.webstoreUrl;
    } else {
      body.source = "crx_url";
      body.url = params.crxUrl!;
    }
    return this._client.request<SessionExtension>({
      method: "POST",
      path,
      body,
    });
  }

  /** Enable or disable an extension without deleting it. */
  async setEnabled(sessionId: string, extensionId: string, enabled: boolean): Promise<void> {
    await this._client.request({
      method: "PATCH",
      path: `/api/v1/sessions/${encodeURIComponent(sessionId)}/extensions/${encodeURIComponent(extensionId)}`,
      body: { enabled },
    });
  }

  /** Permanently delete the extension from the profile. */
  async remove(sessionId: string, extensionId: string): Promise<void> {
    await this._client.request({
      method: "DELETE",
      path: `/api/v1/sessions/${encodeURIComponent(sessionId)}/extensions/${encodeURIComponent(extensionId)}`,
    });
  }
}
