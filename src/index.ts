export { Sprntrl, type ClientOptions } from "./client.js";
export {
  SprntrlError,
  APIError,
  BadRequestError,
  AuthenticationError,
  PermissionDeniedError,
  NotFoundError,
  ConflictError,
  UnprocessableEntityError,
  RateLimitError,
  InternalServerError,
  APIConnectionError,
  APIConnectionTimeoutError,
} from "./core/error.js";
export type {
  OS,
  ProxyProtocol,
  ProxyConfig,
  SessionStatus,
  Session,
  PaginatedSessions,
  Profile,
  Template,
  IPWhitelistEntry,
  APIKey,
  APIKeyCreated,
  Usage,
  UsageMonth,
  User,
  FileInfo,
} from "./types.js";
export type { SessionCreateParams, ConnectOptions, BrowserHandle } from "./resources/sessions.js";
export type { ProfileCreateParams } from "./resources/profiles.js";
export type { FileContent } from "./resources/session-files.js";

export { Sprntrl as default } from "./client.js";
