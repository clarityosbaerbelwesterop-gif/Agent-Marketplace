import { chatComplete, chatStream, UnorouterError } from "@/lib/unorouter";
import type { ChatMessage, ChatToolCall, ChatUsage } from "@/lib/unorouter/types";
import { buildSystemPrompt, resultCheckPrompt } from "./skills";
import { createQueuedRun, updateRun, addUsageToRental } from "./runs";
import { writeMemory } from "./memory";
import { executeRuntimeTool, runtimeTools } from "./tools";
import { TIER_RUNTIME_POLICY, type RuntimeContext, type RuntimeEvent } from "./types";

function addUsage(left: ChatUsage | null, right: ChatUsage | null): ChatUsage | null {
  if (!left) {
    return right;
  }
  if (!right) {
    return left;
  }
  const promptTokens = left.promptTokens + right.promptTokens;
  const completionTokens = left.completionTokens + right.completionTokens;
  const costParts = [left.costUsd, right.costUsd].filter(
    (value): value is number => value != null,
  );
  return {
    promptTokens,
    completionTokens,
    totalTokens: left.totalTokens + right.totalTokens,
    costUsd: costParts.length === 0 ? null : costParts.reduce((a, b) => a + b, 0),
  };
}

async function streamAssistant(input: {
  modelIds: string[];
  messages: ChatMessage[];
  tools: ReturnType<typeof runtimeTools>;
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
  onText?: (text: string) => Promise<void> | void;
}): Promise<{
  message: ChatMessage;
  usage: ChatUsage | null;
  finishReason: string;
  modelId: string;
}> {
  let lastError: unknown;
  for (const model of input.modelIds) {
    try {
      let text = "";
      let toolCalls: ChatToolCall[] | undefined;
      let usage: ChatUsage | null = null;
      let finishReason = "stop";
      for await (const chunk of chatStream({
        model,
        messages: input.messages,
        tools: input.tools.length > 0 ? input.tools : undefined,
        temperature: input.temperature,
        topP: input.topP,
        maxOutputTokens: input.maxOutputTokens,
      })) {
        if (chunk.type === "text") {
          text += chunk.text;
          await input.onText?.(chunk.text);
        } else if (chunk.type === "tool_calls") {
          toolCalls = chunk.toolCalls;
        } else if (chunk.type === "usage") {
          usage = chunk.usage;
        } else if (chunk.type === "finish") {
          finishReason = chunk.reason;
        }
      }
      return {
        modelId: model,
        usage,
        finishReason,
        message: {
          role: "assistant",
          content: text || null,
          tool_calls: toolCalls,
        },
      };
    } catch (error) {
      lastError = error;
      const canFallback =
        error instanceof UnorouterError &&
        (error.code === "not_found" || error.code === "provider_unavailable");
      if (!canFallback) {
        throw error;
      }
    }
  }
  throw lastError;
}

async function checkOutput(
  context: RuntimeContext,
  modelIds: string[],
  outputText: string,
): Promise<{ pass: boolean; notes: string }> {
  if (!context.skill) {
    return { pass: true, notes: "no skill package" };
  }
  try {
    const result = await chatComplete({
      model: modelIds[0],
      messages: [
        {
          role: "user",
          content: resultCheckPrompt(outputText, context.skill),
        },
      ],
      temperature: 0,
      maxOutputTokens: 400,
    });
    const raw = result.message.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      return { pass: true, notes: "check did not return JSON; accepted draft" };
    }
    const parsed = JSON.parse(match[0]) as { pass?: unknown; notes?: unknown };
    return {
      pass: parsed.pass !== false,
      notes: String(parsed.notes ?? ""),
    };
  } catch {
    return { pass: true, notes: "result check skipped after provider error" };
  }
}

export async function executeTurn(
  context: RuntimeContext,
  userMessage: string,
  emit: (event: RuntimeEvent) => Promise<void> | void,
): Promise<void> {
  const message = userMessage.trim();
  if (!message) {
    throw new Error("message is required");
  }

  const policy = TIER_RUNTIME_POLICY[context.agent.tier];
  const tools = runtimeTools(context);
  const skillVersion = context.skill
    ? `${context.skill.slug}@${context.skill.version}`
    : context.agent.skillPackageVersion;
  const primaryModel = context.modelIds[0];

  const run = await createQueuedRun({
    userId: context.userId,
    sessionId: context.session.id,
    modelIdUsed: primaryModel,
    skillVersion,
    payload: { message, background: false },
  });

  await emit({
    type: "meta",
    runId: run.id,
    sessionId: context.session.id,
    rentalId: context.rental.id,
    modelId: primaryModel,
    skillVersion,
    alias: context.alias,
  });

  await updateRun(context.userId, run.id, { status: "running" });
  await emit({ type: "status", status: "running" });

  const activeConnectors = context.connectorGrants
    .filter((grant) => grant.status === "active")
    .map((grant) =>
      grant.hasCredentials
        ? `${grant.provider} (credentials stored)`
        : `${grant.provider} (granted, no credentials)`,
    );
  const system = buildSystemPrompt({
    agentName: context.agent.name,
    agentDescription: context.agent.description,
    tier: context.agent.tier,
    skill: context.skill,
    memories: context.memories,
    connectorSummary:
      activeConnectors.length > 0
        ? `Active connector grants: ${activeConnectors.join(", ")}.`
        : "No active connector grants. Connector tools are unavailable until the user connects one.",
  });

  const messages: ChatMessage[] = [
    { role: "system", content: system },
    ...context.history,
    { role: "user", content: message },
  ];

  let usage: ChatUsage | null = null;
  let modelIdUsed = primaryModel;
  let outputText = "";
  let checkNotes: string | null = null;

  try {
    let attempt = 0;
    const maxAttempts = policy.retryOnCheckFailure ? 2 : 1;

    while (attempt < maxAttempts) {
      outputText = "";
      let rounds = 0;
      while (rounds < policy.maxToolRounds) {
        const result = await streamAssistant({
          modelIds: context.modelIds,
          messages,
          tools,
          temperature: context.agent.modelConfig?.temperature,
          topP: context.agent.modelConfig?.topP,
          maxOutputTokens: context.agent.modelConfig?.maxOutputTokens,
          onText: async (text) => {
            if (attempt === 0 || outputText.length > 0) {
              await emit({ type: "delta", text });
            }
          },
        });
        modelIdUsed = result.modelId;
        usage = addUsage(usage, result.usage);
        messages.push(result.message);

        const toolCalls = result.message.tool_calls ?? [];
        if (toolCalls.length === 0) {
          outputText = result.message.content ?? "";
          break;
        }

        for (const call of toolCalls) {
          await emit({ type: "tool", name: call.function.name, status: "start" });
          let detail = "";
          try {
            detail = await executeRuntimeTool(
              context,
              call.function.name,
              call.function.arguments || "{}",
            );
            await emit({
              type: "tool",
              name: call.function.name,
              status: "done",
              detail: detail.slice(0, 500),
            });
          } catch (error) {
            detail = JSON.stringify({
              error: error instanceof Error ? error.message : "tool failed",
            });
            await emit({
              type: "tool",
              name: call.function.name,
              status: "error",
              detail,
            });
          }
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: detail,
          });
        }
        rounds += 1;
      }

      if (policy.checkResults && outputText.trim()) {
        const checked = await checkOutput(context, context.modelIds, outputText);
        checkNotes = checked.notes;
        if (!checked.pass && attempt + 1 < maxAttempts) {
          messages.push({
            role: "user",
            content: `The previous draft failed the skill checks: ${checked.notes}. Revise the answer. Do not invent metrics.`,
          });
          attempt += 1;
          continue;
        }
      }
      break;
    }

    const output = {
      text: outputText,
      checkNotes,
      modelIdUsed,
    };
    await updateRun(context.userId, run.id, {
      status: "succeeded",
      modelIdUsed,
      output,
      usage,
      finished: true,
    });
    if (usage?.totalTokens) {
      await addUsageToRental(context.userId, context.rental.id, usage.totalTokens);
    }
    await writeMemory({
      userId: context.userId,
      workspaceId: context.rental.workspaceId,
      sessionId: context.session.id,
      kind: "transcript",
      content: `User: ${message}\nAssistant: ${outputText.slice(0, 4000)}`,
    });
    await emit({
      type: "done",
      usage,
      outputText,
      modelIdUsed,
    });
    await emit({ type: "status", status: "succeeded" });
  } catch (error) {
    const messageText =
      error instanceof UnorouterError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Agent run failed";
    const code = error instanceof UnorouterError ? error.code : "unknown";
    await updateRun(context.userId, run.id, {
      status: "failed",
      modelIdUsed,
      output: { error: messageText, code },
      usage,
      finished: true,
    });
    await emit({ type: "error", message: messageText, code });
    await emit({ type: "status", status: "failed" });
  }
}
