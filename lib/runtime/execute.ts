import { chatComplete as unorouterComplete, chatStream as unorouterStream } from "@/lib/unorouter";
import { chatComplete as freellmComplete, chatStream as freellmStream } from "@/lib/freellm";
import type { ChatMessage, ChatToolCall, ChatUsage } from "@/lib/unorouter/types";
import {
  isFailoverError,
  isProviderError,
  type RouteCandidate,
} from "@/lib/llm";
import { buildSystemPrompt, groundingCheckNotes, resultCheckPrompt } from "./skills";
import { createQueuedRun, updateRun, addUsageToRental, claimQueuedRun, assertRunStillOpen, RunCanceledError } from "./runs";
import { writeMemory } from "./memory";
import { drainSkillLearningQueue, enqueueSkillLearning, listNetworkSummaries } from "./network";
import { executeRuntimeTool, runtimeTools } from "./tools";
import {
  continuationUserMessage,
  isLengthFinish,
  MAX_CONTINUATIONS,
} from "./capacity";
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

function chatFns(provider: RouteCandidate["provider"]) {
  if (provider === "freellm") {
    return { complete: freellmComplete, stream: freellmStream };
  }
  return { complete: unorouterComplete, stream: unorouterStream };
}

async function streamAssistant(input: {
  candidates: RouteCandidate[];
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
  provider: RouteCandidate["provider"];
  role: RouteCandidate["role"];
  downgradedFromPaid: boolean;
}> {
  let lastError: unknown;
  for (const candidate of input.candidates) {
    const { stream } = chatFns(candidate.provider);
    let yielded = false;
    try {
      let text = "";
      let toolCalls: ChatToolCall[] | undefined;
      let usage: ChatUsage | null = null;
      let finishReason = "stop";
      let modelId = candidate.modelId;
      for await (const chunk of stream({
        model: candidate.modelId,
        messages: input.messages,
        tools: input.tools.length > 0 ? input.tools : undefined,
        temperature: input.temperature,
        topP: input.topP,
        maxOutputTokens: input.maxOutputTokens,
      })) {
        yielded = true;
        if (chunk.type === "text") {
          text += chunk.text;
          await input.onText?.(chunk.text);
        } else if (chunk.type === "tool_calls") {
          toolCalls = chunk.toolCalls;
        } else if (chunk.type === "usage") {
          usage = chunk.usage;
        } else if (chunk.type === "model") {
          modelId = chunk.modelId || modelId;
        } else if (chunk.type === "finish") {
          finishReason = chunk.reason;
        }
      }
      return {
        modelId,
        provider: candidate.provider,
        role: candidate.role,
        downgradedFromPaid: candidate.downgradedFromPaid,
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
      if (yielded || !isFailoverError(error)) {
        throw error;
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("All model route candidates failed");
}

async function checkOutput(
  context: RuntimeContext,
  candidates: RouteCandidate[],
  outputText: string,
): Promise<{ pass: boolean; notes: string }> {
  const grounded = groundingCheckNotes(outputText);
  if (grounded) {
    return { pass: false, notes: grounded };
  }
  if (!context.skill) {
    return { pass: true, notes: "no skill package" };
  }
  const primary = candidates[0];
  if (!primary) {
    return { pass: true, notes: "no model candidate" };
  }
  try {
    const { complete } = chatFns(primary.provider);
    const result = await complete({
      model: primary.modelId,
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

function inventedSuccessWithoutTools(outputText: string, toolRoundCount: number): boolean {
  if (toolRoundCount > 0) {
    return false;
  }
  return /\b(connected|granted|deployed|created resource|API succeeded|benchmark|success rate)\b/i.test(
    outputText,
  );
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
  const candidates = context.route.length > 0 ? context.route : context.modelIds.map((modelId) => ({
    provider: "unorouter" as const,
    modelId,
    role: "primary" as const,
    downgradedFromPaid: false,
  }));
  const primary = candidates[0];
  if (!primary) {
    throw new Error("No model route candidates");
  }

  const run = await createQueuedRun({
    userId: context.userId,
    sessionId: context.session.id,
    modelIdUsed: primary.modelId,
    providerUsed: primary.provider,
    skillVersion,
    payload: {
      message,
      background: false,
      rentalId: context.rental.id,
      alias: context.alias,
    },
  });

  await emit({
    type: "meta",
    runId: run.id,
    sessionId: context.session.id,
    rentalId: context.rental.id,
    modelId: primary.modelId,
    provider: primary.provider,
    skillVersion,
    alias: context.alias,
    downgradedFromPaid: primary.downgradedFromPaid,
  });

  const claimed = await claimQueuedRun(context.userId, run.id);
  if (!claimed) {
    await emit({
      type: "error",
      message: "Rental has ended",
      code: "rental_ended",
    });
    await emit({ type: "status", status: "canceled" });
    return;
  }
  await emit({ type: "status", status: "running" });

  const activeConnectors = context.connectorGrants
    .filter((grant) => grant.status === "active")
    .map((grant) =>
      grant.hasCredentials
        ? `${grant.provider} (credentials stored)`
        : `${grant.provider} (granted, no credentials)`,
    );
  let networkSummary: string | undefined;
  try {
    const mesh = await listNetworkSummaries(
      context.userId,
      context.rental.workspaceId,
      8,
    );
    if (mesh.nodes.length > 0) {
      networkSummary = [
        "Workspace shared-agent network summaries (not full transcripts, workspace-scoped only):",
        ...mesh.nodes.map(
          (node) =>
            `- [${node.verified ? "verified" : "unverified"} ${node.publisherTier}] ${node.title}: ${node.summary}`,
        ),
      ].join("\n");
    }
  } catch {
    networkSummary = undefined;
  }

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
    networkSummary,
    extraInstructions: context.extraInstructions,
  });

  const messages: ChatMessage[] = [
    { role: "system", content: system },
    ...context.history,
    { role: "user", content: message },
  ];

  let usage: ChatUsage | null = null;
  let modelIdUsed = primary.modelId;
  let providerUsed = primary.provider;
  let downgradedFromPaid = primary.downgradedFromPaid;
  let routeRole = primary.role;
  let outputText = "";
  let checkNotes: string | null = null;
  let toolRoundCount = 0;
  let continuationCount = 0;

  try {
    let attempt = 0;
    const maxAttempts = policy.retryOnCheckFailure ? 2 : 1;

    while (attempt < maxAttempts) {
      outputText = "";
      let rounds = 0;
      while (rounds < policy.maxToolRounds) {
        await assertRunStillOpen(context.userId, run.id);
        const result = await streamAssistant({
          candidates,
          messages,
          tools,
          temperature: context.agent.modelConfig?.temperature,
          topP: context.agent.modelConfig?.topP,
          maxOutputTokens: context.agent.modelConfig?.maxOutputTokens,
          onText: async (text) => {
            if (attempt === 0 || outputText.length > 0) {
              await emit({ type: "delta", text, agentName: context.agent.name });
            }
          },
        });
        modelIdUsed = result.modelId;
        providerUsed = result.provider;
        downgradedFromPaid = result.downgradedFromPaid;
        routeRole = result.role;
        usage = addUsage(usage, result.usage);
        messages.push(result.message);

        const toolCalls = result.message.tool_calls ?? [];
        if (toolCalls.length === 0) {
          outputText += result.message.content ?? "";
          if (
            isLengthFinish(result.finishReason) &&
            continuationCount < MAX_CONTINUATIONS
          ) {
            continuationCount += 1;
            await updateRun(context.userId, run.id, {
              status: "running",
              modelIdUsed,
              providerUsed,
              output: {
                text: outputText,
                continuationCount,
                finishReason: result.finishReason,
              },
              usage,
            });
            await emit({
              type: "continue",
              reason: result.finishReason,
              count: continuationCount,
            });
            messages.push({
              role: "user",
              content: continuationUserMessage(outputText),
            });
            continue;
          }
          break;
        }

        toolRoundCount += 1;
        for (const call of toolCalls) {
          await emit({
            type: "tool",
            name: call.function.name,
            status: "start",
            agentName: context.agent.name,
          });
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
              agentName: context.agent.name,
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
              agentName: context.agent.name,
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

      if (inventedSuccessWithoutTools(outputText, toolRoundCount)) {
        checkNotes = "Draft claimed connector or API success without a tool result.";
        if (attempt + 1 < maxAttempts) {
          messages.push({
            role: "user",
            content:
              "The previous draft claimed a tool or API outcome without calling a tool. Revise using only real tool results. Do not invent metrics.",
          });
          attempt += 1;
          continue;
        }
      }

      if (policy.checkResults && outputText.trim()) {
        const checked = await checkOutput(context, candidates, outputText);
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
      agentName: context.agent.name,
      checkNotes,
      modelIdUsed,
      providerUsed,
      routeRole,
      downgradedFromPaid,
      alias: context.alias,
      continuationCount,
    };
    const finished = await updateRun(context.userId, run.id, {
      status: "succeeded",
      modelIdUsed,
      providerUsed,
      output,
      usage,
      finished: true,
    });
    if (!finished) {
      throw new RunCanceledError();
    }
    if (usage?.totalTokens) {
      await addUsageToRental(context.userId, context.rental.id, usage.totalTokens);
    }
    await writeMemory({
      userId: context.userId,
      workspaceId: context.rental.workspaceId,
      sessionId: context.session.id,
      kind: "transcript",
      visibility: "workspace",
      content: `[${context.agent.name}] User: ${message}\nAssistant: ${outputText.slice(0, 4000)}`,
    });
    void enqueueSkillLearning({
      userId: context.userId,
      workspaceId: context.rental.workspaceId,
      sessionId: context.session.id,
      rentalId: context.rental.id,
      agentProfileId: context.agent.id,
      publisherTier: context.agent.tier,
      summary: outputText,
    }).then(() =>
      drainSkillLearningQueue(context.userId, context.rental.workspaceId),
    );
    await emit({
      type: "done",
      usage,
      outputText,
      modelIdUsed,
      providerUsed,
      downgradedFromPaid,
      agentName: context.agent.name,
    });
    await emit({ type: "status", status: "succeeded", agentName: context.agent.name });
  } catch (error) {
    if (error instanceof RunCanceledError) {
      await emit({
        type: "error",
        message: error.message,
        code: error.code,
      });
      await emit({ type: "status", status: "canceled" });
      return;
    }
    const messageText = isProviderError(error)
      ? error.message
      : error instanceof Error
        ? error.message
        : "Agent run failed";
    const code = isProviderError(error) ? error.code : "unknown";
    await updateRun(context.userId, run.id, {
      status: "failed",
      modelIdUsed,
      providerUsed,
      output: { error: messageText, code, providerUsed, modelIdUsed },
      usage,
      finished: true,
    });
    await emit({ type: "error", message: messageText, code });
    await emit({ type: "status", status: "failed" });
  }
}
