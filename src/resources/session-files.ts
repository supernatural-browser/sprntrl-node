import { APIResource } from "../core/resource.js";
import type { FileInfo } from "../types.js";

export type FileContent = Uint8Array | ArrayBuffer | Blob | string;

export class SessionFiles extends APIResource {
  async list(sessionId: string): Promise<FileInfo[]> {
    const r = await this._client.request<FileInfo[] | { files: FileInfo[] }>({
      method: "GET",
      path: `/api/v1/sessions/${encodeURIComponent(sessionId)}/files`,
    });
    if (Array.isArray(r)) return r;
    return r.files ?? [];
  }

  async download(sessionId: string, filename: string): Promise<ArrayBuffer> {
    const response = await this._client.request<Response>({
      method: "GET",
      path: `/api/v1/sessions/${encodeURIComponent(sessionId)}/files/${encodeURIComponent(filename)}`,
      stream: true,
    });
    return response.arrayBuffer();
  }

  async upload(
    sessionId: string,
    filename: string,
    content: FileContent,
    opts: { contentType?: string } = {},
  ): Promise<void> {
    const form = new FormData();
    const blob =
      content instanceof Blob
        ? content
        : new Blob([content as BlobPart], {
            type: opts.contentType ?? "application/octet-stream",
          });
    form.append("file", blob, filename);
    await this._client.request({
      method: "POST",
      path: `/api/v1/sessions/${encodeURIComponent(sessionId)}/files`,
      body: form,
      rawBody: true,
    });
  }
}
