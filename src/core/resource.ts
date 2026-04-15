import type { Sprntrl } from "../client.js";

export class APIResource {
  protected _client: Sprntrl;

  constructor(client: Sprntrl) {
    this._client = client;
  }
}
