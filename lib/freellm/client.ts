import { createOpenAiCompatClient } from "@/lib/llm/openai-compat";
import type { ChatRequest, ChatResult } from "@/lib/unorouter/types";
import { isFailoverError } from "@/lib/llm/errors";
import {
  getFreellmApiKey,
  getFreellmBaseUrl,
  getFreellmMaxRetries,
  getFreellmTimeoutMs,
} from "./config";

const client = createOpenAiCompatClient({
  provider: "freellm",
  getBaseUrl: getFreellmBaseUrl,
  getApiKey: getFreellmApiKey,
  getTimeoutMs: getFreellmTimeoutMs,
  getMaxRetries: getFreellmMaxRetries,
});

export const listModels = client.listModels;
export const chatComplete = client.chatComplete;
export const chatStream = client.chatStream;

export async function chatWithFallback(
  aliasModels: string[],
  request: Omit<ChatRequest, "model"> & { model?: string },
): Promise<ChatResult> {
  let lastError: unknown;
  for (const model of aliasModels) {
    try {
      return await chatComplete({ ...request, model });
    } catch (error) {
      lastError = error;
      if (!isFailoverError(error)) {
        throw error;
      }
    }
  }
  throw lastError;
}
