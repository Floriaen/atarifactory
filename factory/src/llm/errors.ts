export class LLMError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Thrown when a provider response lacks usage — we fail loud, never silently zero. */
export class MissingUsageError extends LLMError {}

/** Thrown when structured output does not satisfy the Zod schema (drift). */
export class SchemaValidationError extends LLMError {
  constructor(
    message: string,
    readonly issues?: unknown,
  ) {
    super(message);
  }
}

/** Thrown when a provider call fails (transport, auth, rate limit, etc.). */
export class ProviderError extends LLMError {
  constructor(
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message);
  }
}
