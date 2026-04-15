import { SprntrlError } from "./core/error.js";
import { request as coreRequest, type RequestConfig, type RequestOptions } from "./core/request.js";
import { Sessions } from "./resources/sessions.js";
import { Profiles } from "./resources/profiles.js";
import { Templates } from "./resources/templates.js";
import { IPWhitelist } from "./resources/ip-whitelist.js";
import { Usage } from "./resources/usage.js";
import { User } from "./resources/user.js";
import { APIKeys } from "./resources/api-keys.js";

export interface ClientOptions {
  apiKey?: string;
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
  defaultHeaders?: Record<string, string>;
  fetch?: typeof fetch;
}

const DEFAULT_BASE_URL = "https://api.sprntrl.ai";
const DEFAULT_TIMEOUT = 60_000;
const DEFAULT_MAX_RETRIES = 2;

export class Sprntrl {
  readonly apiKey: string;
  readonly baseURL: string;
  readonly timeout: number;
  readonly maxRetries: number;

  private readonly _config: RequestConfig;

  readonly sessions: Sessions;
  readonly profiles: Profiles;
  readonly templates: Templates;
  readonly ipWhitelist: IPWhitelist;
  readonly usage: Usage;
  readonly user: User;
  readonly apiKeys: APIKeys;

  constructor(opts: ClientOptions = {}) {
    const apiKey = opts.apiKey ?? process.env.SPRNTRL_API_KEY;
    if (!apiKey) {
      throw new SprntrlError(
        "No API key provided. Pass apiKey or set SPRNTRL_API_KEY.",
      );
    }
    const baseURL = (opts.baseURL ?? process.env.SPRNTRL_BASE_URL ?? DEFAULT_BASE_URL).replace(
      /\/+$/,
      "",
    );
    this.apiKey = apiKey;
    this.baseURL = baseURL;
    this.timeout = opts.timeout ?? DEFAULT_TIMEOUT;
    this.maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;

    this._config = {
      apiKey,
      baseURL,
      timeout: this.timeout,
      maxRetries: this.maxRetries,
      defaultHeaders: opts.defaultHeaders ?? {},
      fetch: opts.fetch,
    };

    this.sessions = new Sessions(this);
    this.profiles = new Profiles(this);
    this.templates = new Templates(this);
    this.ipWhitelist = new IPWhitelist(this);
    this.usage = new Usage(this);
    this.user = new User(this);
    this.apiKeys = new APIKeys(this);
  }

  /** Low-level request escape hatch. Resources use this under the hood. */
  request<T = unknown>(opts: RequestOptions): Promise<T> {
    return coreRequest<T>(this._config, opts);
  }
}
