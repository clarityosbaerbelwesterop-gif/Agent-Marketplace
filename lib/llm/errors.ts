export type ProviderId = "unorouter" | "freellm";

export type ProviderErrorCode =
  | "not_configured"
  | "invalid_api_key"
  | "alias_unresolved"
  | "model_capability"
  | "rate_limited"
  | "provider_unavailable"
  | "timeout"
  | "aborted"
  | "bad_request"
  | "payment_required"
  | "not_found"
  | "server_error"
  | "unknown";

export class ProviderError extends Error {
  readonly provider: ProviderId;
  readonly code: ProviderErrorCode;
  readonly status: number;
  readonly retryable: boolean;
  readonly retryAfterMs?: number;
  readonly modelId?: string;

  constructor(options: {
    provider: ProviderId;
    message: string;
    code: ProviderErrorCode;
    status?: number;
    retryable?: boolean;
    retryAfterMs?: number;
    modelId?: string;
    cause?: unknown;
  }) {
    super(options.message, { cause: options.cause });
    this.name = options.provider === "freellm" ? "FreellmError" : "UnorouterError";
    this.provider = options.provider;
    this.code = options.code;
    this.status = options.status ?? 500;
    this.retryable = options.retryable ?? false;
    this.retryAfterMs = options.retryAfterMs;
    this.modelId = options.modelId;
  }
}

export function parseRetryAfter(header: string | null): number | undefined {
  if (!header) {
    return undefined;
  }
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, 60_000);
  }
  const date = Date.parse(header);
  if (Number.isFinite(date)) {
    return Math.min(Math.max(date - Date.now(), 0), 60_000);
  }
  return undefined;
}

export function errorFromHttpStatus(
  provider: ProviderId,
  status: number,
  message: string,
  retryAfterMs?: number,
  modelId?: string,
): ProviderError {
  if (status === 401) {
    return new ProviderError({
      provider,
      message,
      code: "invalid_api_key",
      status,
      modelId,
    });
  }
  if (status === 402) {
    return new ProviderError({
      provider,
      message,
      code: "payment_required",
      status,
      modelId,
    });
  }
  if (status === 400) {
    return new ProviderError({
      provider,
      message,
      code: "bad_request",
      status,
      modelId,
    });
  }
  if (status === 404) {
    return new ProviderError({
      provider,
      message,
      code: "not_found",
      status,
      retryable: false,
      modelId,
    });
  }
  if (status === 408 || status === 504) {
    return new ProviderError({
      provider,
      message,
      code: "timeout",
      status,
      retryable: true,
      retryAfterMs,
      modelId,
    });
  }
  if (status === 429) {
    return new ProviderError({
      provider,
      message,
      code: "rate_limited",
      status,
      retryable: true,
      retryAfterMs: retryAfterMs ?? 15_000,
      modelId,
    });
  }
  if (status === 502 || status === 503) {
    return new ProviderError({
      provider,
      message,
      code: "provider_unavailable",
      status,
      retryable: true,
      retryAfterMs: retryAfterMs ?? 2000,
      modelId,
    });
  }
  return new ProviderError({
    provider,
    message,
    code: "server_error",
    status,
    retryable: status >= 500,
    retryAfterMs,
    modelId,
  });
}

export function isProviderError(error: unknown): error is ProviderError {
  return error instanceof ProviderError;
}

/** Quota / availability failures that justify failing over to another provider. */
export const FAILOVER_ERROR_CODES: ReadonlySet<ProviderErrorCode> = new Set([
  "rate_limited",
  "provider_unavailable",
  "timeout",
  "payment_required",
  "not_found",
  "server_error",
  "not_configured",
]);

export function isFailoverError(error: unknown): boolean {
  return isProviderError(error) && FAILOVER_ERROR_CODES.has(error.code);
}
