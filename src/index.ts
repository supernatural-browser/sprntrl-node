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
  ProxySummary,
  PaginatedSessions,
  Profile,
  Template,
  IPWhitelistEntry,
  APIKey,
  APIKeyCreated,
  Usage,
  UsageMonth,
  User,
  AccountStatus,
  FileInfo,
  SessionExtension,
  ExtensionInlineSpec,
  ExtensionAddParams,
} from "./types.js";
export type { SessionCreateParams, ConnectOptions, BrowserHandle } from "./resources/sessions.js";
export type { UserSettings, ChangePasswordResult } from "./resources/user.js";
export type { ProfileCreateParams } from "./resources/profiles.js";
export type { FileContent } from "./resources/session-files.js";

export { Sprntrl as default } from "./client.js";
