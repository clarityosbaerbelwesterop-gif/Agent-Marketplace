import type { StudioEvent } from "./types";

export type StudioSseHandlers = {
  onMeta?: (event: Extract<StudioEvent, { type: "meta" }>) => void;
  onStep?: (event: Extract<StudioEvent, { type: "step" }>) => void;
  onLog?: (event: Extract<StudioEvent, { type: "log" }>) => void;
  onDone?: (event: Extract<StudioEvent, { type: "done" }>) => void;
  onError?: (message: string, code?: string) => void;
};

export function applyStudioSseBlock(rawEvent: string, handlers: StudioSseHandlers) {
  const lines = rawEvent.split("\n");
  let eventName = "";
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim();
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trim());
    }
  }
  if (!dataLines.length) {
    return;
  }
  const data = JSON.parse(dataLines.join("\n")) as StudioEvent;
  const type = eventName || data.type;
  if (type === "meta" && data.type === "meta") {
    handlers.onMeta?.(data);
    return;
  }
  if (type === "step" && data.type === "step") {
    handlers.onStep?.(data);
    return;
  }
  if (type === "log" && data.type === "log") {
    handlers.onLog?.(data);
    return;
  }
  if (type === "done" && data.type === "done") {
    handlers.onDone?.(data);
    return;
  }
  if (type === "error") {
    const message =
      data.type === "error" ? data.message : "Run failed";
    const code = data.type === "error" ? data.code : undefined;
    handlers.onError?.(message, code);
  }
}

export async function consumeStudioSse(
  response: Response,
  handlers: StudioSseHandlers,
): Promise<void> {
  if (!response.body) {
    throw new Error("No stream from studio API");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    let sep = buffer.indexOf("\n\n");
    while (sep !== -1) {
      applyStudioSseBlock(buffer.slice(0, sep), handlers);
      buffer = buffer.slice(sep + 2);
      sep = buffer.indexOf("\n\n");
    }
    if (done) {
      break;
    }
  }
}
