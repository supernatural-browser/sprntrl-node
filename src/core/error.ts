export class SprntrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SprntrlError";
  }
}

export class APIError extends SprntrlError {
  readonly status?: number;
  readonly body?: unknown;
  readonly headers?: Headers;

  constructor(
    message: string,
    opts: { status?: number; body?: unknown; headers?: Headers } = {},
  ) {
    super(message);
    this.name = "APIError";
    this.status = opts.status;
    this.body = opts.body;
    this.headers = opts.headers;
  }
}

export class BadRequestError extends APIError { name = "BadRequestError"; }
export class AuthenticationError extends APIError { name = "AuthenticationError"; }
export class PermissionDeniedError extends APIError { name = "PermissionDeniedError"; }
export class NotFoundError extends APIError { name = "NotFoundError"; }
export class ConflictError extends APIError { name = "ConflictError"; }
export class UnprocessableEntityError extends APIError { name = "UnprocessableEntityError"; }
export class RateLimitError extends APIError { name = "RateLimitError"; }
export class InternalServerError extends APIError { name = "InternalServerError"; }

export class APIConnectionError extends APIError {
  constructor(message = "Connection error", opts: { cause?: unknown } = {}) {
    super(message);
    this.name = "APIConnectionError";
    if (opts.cause !== undefined) (this as { cause?: unknown }).cause = opts.cause;
  }
}

export class APIConnectionTimeoutError extends APIConnectionError {
  constructor(message = "Request timed out") {
    super(message);
    this.name = "APIConnectionTimeoutError";
  }
}

export function errorForStatus(
  status: number,
  message: string,
  body?: unknown,
  headers?: Headers,
): APIError {
  const opts = { status, body, headers };
  switch (status) {
    case 400: return new BadRequestError(message, opts);
    case 401: return new AuthenticationError(message, opts);
    case 403: return new PermissionDeniedError(message, opts);
    case 404: return new NotFoundError(message, opts);
    case 409: return new ConflictError(message, opts);
    case 422: return new UnprocessableEntityError(message, opts);
    case 429: return new RateLimitError(message, opts);
  }
  if (status >= 500) return new InternalServerError(message, opts);
  return new APIError(message, opts);
}
