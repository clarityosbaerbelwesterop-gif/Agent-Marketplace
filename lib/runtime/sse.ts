import type { RuntimeEvent } from "./types";

const encoder = new TextEncoder();

export function encodeSse<E extends { type: string }>(event: E): Uint8Array {
  return encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
}

export function sseHeaders(): HeadersInit {
  return {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    "x-accel-buffering": "no",
  };
}

export function createSseStream<E extends { type: string } = RuntimeEvent>(
  run: (emit: (event: E) => Promise<void>) => Promise<void>,
): { stream: ReadableStream<Uint8Array>; done: Promise<void> } {
  let resolveDone: () => void = () => undefined;
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = async (event: E) => {
        try {
          controller.enqueue(encodeSse(event));
        } catch {
          // Client disconnected; keep the run going for DB persistence.
        }
      };
      void run(emit)
        .catch(async (error) => {
          const message = error instanceof Error ? error.message : "stream failed";
          await emit({ type: "error", message, code: "unknown" } as unknown as E);
        })
        .finally(() => {
          try {
            controller.close();
          } catch {
            // already closed
          }
          resolveDone();
        });
    },
  });

  return { stream, done };
}
