import {
  ProviderError,
  errorFromHttpStatus as llmErrorFromHttpStatus,
  parseRetryAfter as llmParseRetryAfter,
  type ProviderErrorCode,
} from "@/lib/llm/errors";

export type FreellmErrorCode = ProviderErrorCode;

export class FreellmError extends ProviderError {
  constructor(options: {
    message: string;
    code: FreellmErrorCode;
    status?: number;
    retryable?: boolean;
    retryAfterMs?: number;
    modelId?: string;
    cause?: unknown;
  }) {
    super({ ...options, provider: "freellm" });
    this.name = "FreellmError";
  }
}

export function isFreellmError(error: unknown): error is FreellmError {
  return error instanceof FreellmError || (error instanceof ProviderError && error.provider === "freellm");
}

export const parseRetryAfter = llmParseRetryAfter;

export function errorFromHttpStatus(
  status: number,
  message: string,
  retryAfterMs?: number,
  modelId?: string,
): FreellmError {
  const err = llmErrorFromHttpStatus(
    "freellm",
    status,
    message,
    retryAfterMs,
    modelId,
  );
  return new FreellmError({
    message: err.message,
    code: err.code,
    status: err.status,
    retryable: err.retryable,
    retryAfterMs: err.retryAfterMs,
    modelId: err.modelId,
    cause: err.cause,
  });
}
