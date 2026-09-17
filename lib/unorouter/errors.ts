export type UnorouterErrorCode =
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

export class UnorouterError extends Error {
  readonly code: UnorouterErrorCode;
  readonly status: number;
  readonly retryable: boolean;
  readonly retryAfterMs?: number;
  readonly modelId?: string;

  constructor(options: {
    message: string;
    code: UnorouterErrorCode;
    status?: number;
    retryable?: boolean;
    retryAfterMs?: number;
    modelId?: string;
    cause?: unknown;
  }) {
    super(options.message, { cause: options.cause });
    this.name = "UnorouterError";
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
  status: number,
  message: string,
  retryAfterMs?: number,
  modelId?: string,
): UnorouterError {
  if (status === 401) {
    return new UnorouterError({
      message,
      code: "invalid_api_key",
      status,
      modelId,
    });
  }
  if (status === 402) {
    return new UnorouterError({
      message,
      code: "payment_required",
      status,
      modelId,
    });
  }
  if (status === 400) {
    return new UnorouterError({
      message,
      code: "bad_request",
      status,
      modelId,
    });
  }
  if (status === 404) {
    return new UnorouterError({
      message,
      code: "not_found",
      status,
      retryable: false,
      modelId,
    });
  }
  if (status === 408 || status === 504) {
    return new UnorouterError({
      message,
      code: "timeout",
      status,
      retryable: true,
      retryAfterMs,
      modelId,
    });
  }
  if (status === 429) {
    return new UnorouterError({
      message,
      code: "rate_limited",
      status,
      retryable: true,
      retryAfterMs: retryAfterMs ?? 15_000,
      modelId,
    });
  }
  if (status === 502 || status === 503) {
    return new UnorouterError({
      message,
      code: "provider_unavailable",
      status,
      retryable: true,
      retryAfterMs: retryAfterMs ?? 2000,
      modelId,
    });
  }
  return new UnorouterError({
    message,
    code: "server_error",
    status,
    retryable: status >= 500,
    retryAfterMs,
    modelId,
  });
}

export function isUnorouterError(error: unknown): error is UnorouterError {
  return error instanceof UnorouterError;
}
