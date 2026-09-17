import type {
  ChatMessage,
  ChatRequest,
  ChatResult,
  ChatToolCall,
  ChatUsage,
  StreamChunk,
} from "@/lib/unorouter/types";
import {
  errorFromHttpStatus,
  parseRetryAfter,
  ProviderError,
  type ProviderId,
} from "./errors";

type ProviderErrorBody = {
  error?: { message?: string; type?: string; code?: string } | string;
  message?: string;
};

export type OpenAiCompatHooks = {
  provider: ProviderId;
  getBaseUrl: () => string;
  getApiKey: () => string;
  getTimeoutMs: () => number;
  getMaxRetries: () => number;
  estimateCostUsd?: (input: {
    modelId: string;
    promptTokens: number;
    completionTokens: number;
  }) => number | null;
  assertToolsSupported?: (modelId: string, needsTools: boolean) => void;
  samplingForModel?: (
    modelId: string,
    options: { temperature?: number; topP?: number; maxOutputTokens?: number },
  ) => { temperature?: number; topP?: number; max_tokens?: number };
  rememberLiveModel?: (modelId: string) => void;
};

function mergeSignals(timeoutMs: number, external?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  if (!external) {
    return timeout;
  }
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any([timeout, external]);
  }
  const controller = new AbortController();
  const onAbort = () => controller.abort(external.reason ?? timeout.reason);
  if (external.aborted || timeout.aborted) {
    onAbort();
    return controller.signal;
  }
  external.addEventListener("abort", onAbort, { once: true });
  timeout.addEventListener("abort", onAbort, { once: true });
  return controller.signal;
}

async function sleep(ms: number, signal: AbortSignal | undefined, provider: ProviderId): Promise<void> {
  if (ms <= 0) {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(
        new ProviderError({
          provider,
          message: `${provider} request aborted`,
          code: "aborted",
          status: 499,
        }),
      );
    };
    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function readErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") {
    return fallback;
  }
  const parsed = body as ProviderErrorBody;
  if (typeof parsed.error === "string" && parsed.error.trim()) {
    return parsed.error;
  }
  if (
    parsed.error &&
    typeof parsed.error === "object" &&
    typeof parsed.error.message === "string"
  ) {
    return parsed.error.message;
  }
  if (typeof parsed.message === "string" && parsed.message.trim()) {
    return parsed.message;
  }
  return fallback;
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

function toUsage(
  hooks: OpenAiCompatHooks,
  modelId: string,
  raw: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    cost?: number;
  } | null
  | undefined,
): ChatUsage | null {
  if (!raw) {
    return null;
  }
  const promptTokens = Number(raw.prompt_tokens ?? 0);
  const completionTokens = Number(raw.completion_tokens ?? 0);
  const totalTokens = Number(raw.total_tokens ?? promptTokens + completionTokens);
  const providerCost =
    typeof raw.cost === "number" && Number.isFinite(raw.cost) ? raw.cost : null;
  return {
    promptTokens,
    completionTokens,
    totalTokens,
    costUsd:
      providerCost ??
      hooks.estimateCostUsd?.({ modelId, promptTokens, completionTokens }) ??
      null,
  };
}

function requestBody(hooks: OpenAiCompatHooks, request: ChatRequest, stream: boolean): Record<string, unknown> {
  const sampling = hooks.samplingForModel
    ? hooks.samplingForModel(request.model, {
        temperature: request.temperature,
        topP: request.topP,
        maxOutputTokens: request.maxOutputTokens,
      })
    : {
        temperature: request.temperature,
        topP: request.topP,
        max_tokens: request.maxOutputTokens,
      };
  const body: Record<string, unknown> = {
    model: request.model,
    messages: request.messages,
    stream,
  };
  if (stream) {
    body.stream_options = { include_usage: true };
  }
  if (request.tools && request.tools.length > 0) {
    hooks.assertToolsSupported?.(request.model, true);
    body.tools = request.tools;
  }
  if (typeof sampling.temperature === "number") {
    body.temperature = sampling.temperature;
  }
  if (typeof sampling.topP === "number") {
    body.top_p = sampling.topP;
  }
  if (typeof sampling.max_tokens === "number") {
    body.max_tokens = sampling.max_tokens;
  }
  return body;
}

async function throwFromResponse(
  hooks: OpenAiCompatHooks,
  response: Response,
  modelId: string,
): Promise<never> {
  const payload = await parseJsonSafe(response);
  const message = readErrorMessage(
    payload,
    `${hooks.provider} request failed with HTTP ${response.status}`,
  );
  throw errorFromHttpStatus(
    hooks.provider,
    response.status,
    message,
    parseRetryAfter(response.headers.get("retry-after")),
    modelId,
  );
}

async function fetchProvider(
  hooks: OpenAiCompatHooks,
  path: string,
  init: {
    method: string;
    body?: unknown;
    signal?: AbortSignal;
    accept?: string;
  },
): Promise<Response> {
  const key = hooks.getApiKey();
  const url = `${hooks.getBaseUrl()}${path}`;
  try {
    return await fetch(url, {
      method: init.method,
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
        accept: init.accept ?? "application/json",
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: init.signal,
    });
  } catch (error) {
    if (error instanceof ProviderError) {
      throw error;
    }
    const aborted =
      (error instanceof Error && error.name === "AbortError") ||
      (typeof error === "object" &&
        error !== null &&
        "name" in error &&
        (error as { name?: string }).name === "TimeoutError");
    throw new ProviderError({
      provider: hooks.provider,
      message: aborted
        ? `${hooks.provider} request timed out or was aborted`
        : error instanceof Error
          ? error.message
          : `${hooks.provider} network error`,
      code: aborted ? "timeout" : "server_error",
      status: aborted ? 504 : 502,
      retryable: true,
      cause: error,
    });
  }
}

async function withRetries<T>(
  hooks: OpenAiCompatHooks,
  modelId: string,
  signal: AbortSignal | undefined,
  run: () => Promise<T>,
): Promise<T> {
  const maxRetries = hooks.getMaxRetries();
  let attempt = 0;
  let lastError: unknown;
  while (attempt <= maxRetries) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      const retryable =
        error instanceof ProviderError &&
        error.retryable &&
        error.code !== "invalid_api_key" &&
        error.code !== "not_configured";
      if (!retryable || attempt >= maxRetries) {
        throw error;
      }
      const wait =
        error instanceof ProviderError
          ? (error.retryAfterMs ?? 1000 * (attempt + 1))
          : 1000 * (attempt + 1);
      await sleep(wait, signal, hooks.provider);
      attempt += 1;
    }
  }
  throw lastError;
}

function asAssistantMessage(raw: {
  content?: string | null;
  tool_calls?: ChatToolCall[];
}): ChatMessage {
  return {
    role: "assistant",
    content: raw.content ?? null,
    tool_calls:
      raw.tool_calls && raw.tool_calls.length > 0 ? raw.tool_calls : undefined,
  };
}

function emptyToolCall(): ChatToolCall {
  return {
    id: "",
    type: "function",
    function: { name: "", arguments: "" },
  };
}

function mergeToolCallDelta(
  acc: ChatToolCall[],
  delta: Array<{
    index?: number;
    id?: string;
    type?: "function";
    function?: { name?: string; arguments?: string };
  }>,
) {
  for (const part of delta) {
    const index = part.index ?? acc.length;
    while (acc.length <= index) {
      acc.push(emptyToolCall());
    }
    const current = acc[index];
    if (part.id) {
      current.id = part.id;
    }
    if (part.function?.name) {
      current.function.name += part.function.name;
    }
    if (part.function?.arguments) {
      current.function.arguments += part.function.arguments;
    }
  }
}

async function* iterateSse(hooks: OpenAiCompatHooks, response: Response): AsyncGenerator<string> {
  if (!response.body) {
    throw new ProviderError({
      provider: hooks.provider,
      message: `${hooks.provider} stream had no body`,
      code: "server_error",
      status: 502,
    });
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      let sep = buffer.indexOf("\n\n");
      while (sep !== -1) {
        const rawEvent = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const dataLines = rawEvent
          .split("\n")
          .map((line) => line.replace(/\r$/, ""))
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart());
        if (dataLines.length > 0) {
          yield dataLines.join("\n");
        }
        sep = buffer.indexOf("\n\n");
      }
      if (done) {
        break;
      }
    }
    if (buffer.trim()) {
      const dataLines = buffer
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart());
      if (dataLines.length > 0) {
        yield dataLines.join("\n");
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function routedModelFromHeaders(response: Response, fallback: string): string {
  const routed = response.headers.get("x-routed-via")?.trim();
  if (!routed) {
    return fallback;
  }
  const slash = routed.lastIndexOf("/");
  if (slash > 0 && slash < routed.length - 1) {
    try {
      return decodeURIComponent(routed.slice(slash + 1));
    } catch {
      return routed.slice(slash + 1);
    }
  }
  return routed;
}

export function createOpenAiCompatClient(hooks: OpenAiCompatHooks) {
  async function listModels(signal?: AbortSignal): Promise<
    Array<{ id: string; ownedBy?: string }>
  > {
    const timeout = mergeSignals(hooks.getTimeoutMs(), signal);
    const response = await withRetries(hooks, "models", timeout, async () => {
      const res = await fetchProvider(hooks, "/models", {
        method: "GET",
        signal: timeout,
      });
      if (!res.ok) {
        await throwFromResponse(hooks, res, "models");
      }
      return res;
    });
    const payload = (await response.json()) as {
      data?: Array<{ id?: string; owned_by?: string }>;
    };
    const models = (payload.data ?? [])
      .map((row) => ({
        id: row.id?.trim() ?? "",
        ownedBy: row.owned_by,
      }))
      .filter((row) => row.id);
    for (const model of models) {
      hooks.rememberLiveModel?.(model.id);
    }
    return models;
  }

  async function chatComplete(request: ChatRequest): Promise<ChatResult> {
    const timeout = mergeSignals(hooks.getTimeoutMs(), request.signal);
    const body = requestBody(hooks, request, false);
    const response = await withRetries(hooks, request.model, timeout, async () => {
      const res = await fetchProvider(hooks, "/chat/completions", {
        method: "POST",
        body,
        signal: timeout,
      });
      if (!res.ok) {
        await throwFromResponse(hooks, res, request.model);
      }
      return res;
    });
    const payload = (await response.json()) as {
      model?: string;
      choices?: Array<{
        finish_reason?: string;
        message?: { content?: string | null; tool_calls?: ChatToolCall[] };
      }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
        cost?: number;
      };
    };
    const choice = payload.choices?.[0];
    const modelId =
      payload.model || routedModelFromHeaders(response, request.model);
    return {
      modelId,
      message: asAssistantMessage(choice?.message ?? {}),
      usage: toUsage(hooks, modelId, payload.usage),
      finishReason: choice?.finish_reason ?? null,
    };
  }

  async function* chatStream(request: ChatRequest): AsyncGenerator<StreamChunk> {
    const timeout = mergeSignals(hooks.getTimeoutMs(), request.signal);
    const body = requestBody(hooks, request, true);
    const response = await withRetries(hooks, request.model, timeout, async () => {
      const res = await fetchProvider(hooks, "/chat/completions", {
        method: "POST",
        body,
        signal: timeout,
        accept: "text/event-stream",
      });
      if (!res.ok) {
        await throwFromResponse(hooks, res, request.model);
      }
      return res;
    });

    const toolCalls: ChatToolCall[] = [];
    let finishReason = "stop";
    let modelId = routedModelFromHeaders(response, request.model);

    for await (const data of iterateSse(hooks, response)) {
      if (data === "[DONE]") {
        break;
      }
      let parsed: {
        model?: string;
        choices?: Array<{
          finish_reason?: string | null;
          delta?: {
            content?: string | null;
            tool_calls?: Array<{
              index?: number;
              id?: string;
              type?: "function";
              function?: { name?: string; arguments?: string };
            }>;
          };
        }>;
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
          cost?: number;
        };
      };
      try {
        parsed = JSON.parse(data) as typeof parsed;
      } catch {
        continue;
      }
      if (parsed.model) {
        modelId = parsed.model;
      }
      const choice = parsed.choices?.[0];
      const text = choice?.delta?.content;
      if (text) {
        yield { type: "text", text };
      }
      if (choice?.delta?.tool_calls) {
        mergeToolCallDelta(toolCalls, choice.delta.tool_calls);
      }
      if (choice?.finish_reason) {
        finishReason = choice.finish_reason;
      }
      if (parsed.usage) {
        yield { type: "usage", usage: toUsage(hooks, modelId, parsed.usage)! };
      }
    }

    const completeCalls = toolCalls.filter((call) => call.id && call.function.name);
    if (completeCalls.length > 0) {
      yield { type: "tool_calls", toolCalls: completeCalls };
    }
    yield { type: "model", modelId };
    yield { type: "finish", reason: finishReason };
  }

  return { listModels, chatComplete, chatStream };
}
