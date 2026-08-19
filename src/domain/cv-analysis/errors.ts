/**
 * Domain-level error taxonomy for the CV analysis flow. Route handlers map
 * these to HTTP status codes and user-facing messages; infrastructure code
 * throws them (rather than raw Errors) so the boundary between "something we
 * understand went wrong" and "unexpected failure" stays explicit.
 */

export class InvalidFileTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidFileTypeError";
  }
}

export class FileTooLargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileTooLargeError";
  }
}

export class EmptyJobDescriptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmptyJobDescriptionError";
  }
}

export class CvParsingError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "CvParsingError";
  }
}

/** Communication or response-shape failure talking to the AI provider. */
export class AiServiceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AiServiceError";
  }
}

/** The AI provider is not usable at all right now (e.g. missing API key). */
export class AiServiceUnavailableError extends AiServiceError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AiServiceUnavailableError";
  }
}

export class RateLimitExceededError extends Error {
  constructor(
    message: string,
    public readonly retryAfterSeconds: number,
  ) {
    super(message);
    this.name = "RateLimitExceededError";
  }
}
