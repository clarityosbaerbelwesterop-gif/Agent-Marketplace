import {
  ProviderError,
  errorFromHttpStatus as llmErrorFromHttpStatus,
  parseRetryAfter as llmParseRetryAfter,
  type ProviderErrorCode,
} from "@/lib/llm/errors";

export type UnorouterErrorCode = ProviderErrorCode;

export class UnorouterError extends ProviderError {
  constructor(options: {
    message: string;
    code: UnorouterErrorCode;
    status?: number;
    retryable?: boolean;
    retryAfterMs?: number;
    modelId?: string;
    cause?: unknown;
  }) {
    super({ ...options, provider: "unorouter" });
    this.name = "UnorouterError";
  }
}

export const parseRetryAfter = llmParseRetryAfter;

export function errorFromHttpStatus(
  status: number,
  message: string,
  retryAfterMs?: number,
  modelId?: string,
): UnorouterError {
  const err = llmErrorFromHttpStatus(
    "unorouter",
    status,
    message,
    retryAfterMs,
    modelId,
  );
  return new UnorouterError({
    message: err.message,
    code: err.code,
    status: err.status,
    retryable: err.retryable,
    retryAfterMs: err.retryAfterMs,
    modelId: err.modelId,
  });
}

export function isUnorouterError(error: unknown): error is UnorouterError {
  return error instanceof ProviderError && error.provider === "unorouter";
}
