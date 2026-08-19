/** Error taxonomy for the historial flow — mirrors domain/cv-analysis/errors.ts. */

export class UnauthenticatedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnauthenticatedError";
  }
}

export class InvalidHistoryInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidHistoryInputError";
  }
}

/**
 * Also thrown when the entry belongs to a different user — the lookup is
 * always scoped by the caller's own userId, so "doesn't exist" and
 * "someone else's entry" are indistinguishable on purpose (no ownership
 * probing via error messages).
 */
export class HistoryEntryNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HistoryEntryNotFoundError";
  }
}
