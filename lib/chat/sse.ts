import type { RuntimeEvent } from "@/lib/runtime/types";

export type ChatSseHandlers = {
  onMeta?: (event: Extract<RuntimeEvent, { type: "meta" }>) => void;
  onDelta?: (text: string) => void;
  onTool?: (event: Extract<RuntimeEvent, { type: "tool" }>) => void;
  onStatus?: (status: string) => void;
  onDone?: (event: Extract<RuntimeEvent, { type: "done" }>) => void;
  onError?: (message: string, code?: string) => void;
};

type LooseSsePayload = {
  type?: string;
  text?: string;
  message?: string;
  code?: string;
  name?: string;
  status?: string;
  detail?: string;
  runId?: string;
  sessionId?: string;
  rentalId?: string;
  modelId?: string;
  skillVersion?: string | null;
  alias?: string;
  outputText?: string;
  modelIdUsed?: string;
  provider?: string;
  providerUsed?: string;
  agentName?: string;
  downgradedFromPaid?: boolean;
  usage?: Extract<RuntimeEvent, { type: "done" }>["usage"];
};

function applyPayload(data: LooseSsePayload, eventName: string, handlers: ChatSseHandlers) {
  const type = eventName || data.type;
  if (type === "meta") {
    handlers.onMeta?.({
      type: "meta",
      runId: data.runId ?? "",
      sessionId: data.sessionId ?? "",
      rentalId: data.rentalId ?? "",
      modelId: data.modelId ?? "",
      provider: data.provider,
      skillVersion: data.skillVersion ?? null,
      alias: (data.alias ?? "standard") as Extract<RuntimeEvent, { type: "meta" }>["alias"],
      downgradedFromPaid: data.downgradedFromPaid,
    });
    return;
  }
  if (type === "delta") {
    handlers.onDelta?.(data.text ?? "");
    return;
  }
  if (type === "tool") {
    const status =
      data.status === "done" || data.status === "error" ? data.status : "start";
    handlers.onTool?.({
      type: "tool",
      name: data.name ?? "tool",
      status,
      detail: data.detail,
      agentName: data.agentName,
    });
    return;
  }
  if (type === "status") {
    handlers.onStatus?.(data.status ?? "");
    return;
  }
  if (type === "done") {
    handlers.onDone?.({
      type: "done",
      usage: data.usage ?? null,
      outputText: data.outputText ?? "",
      modelIdUsed: data.modelIdUsed ?? data.modelId ?? "",
      providerUsed: data.providerUsed ?? data.provider,
      downgradedFromPaid: data.downgradedFromPaid,
      agentName: data.agentName,
    });
    return;
  }
  if (type === "error") {
    handlers.onError?.(data.message ?? "Run failed", data.code);
  }
}

export function applySseBlock(rawEvent: string, handlers: ChatSseHandlers) {
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
  const data = JSON.parse(dataLines.join("\n")) as LooseSsePayload;
  applyPayload(data, eventName, handlers);
}

export async function consumeChatSse(
  response: Response,
  handlers: ChatSseHandlers,
): Promise<void> {
  if (!response.body) {
    throw new Error("No stream from chat API");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    let sep = buffer.indexOf("\n\n");
    while (sep !== -1) {
      applySseBlock(buffer.slice(0, sep), handlers);
      buffer = buffer.slice(sep + 2);
      sep = buffer.indexOf("\n\n");
    }
    if (done) {
      break;
    }
  }
}
