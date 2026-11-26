import { formatUsd, getModelPricing } from "@/src/lib/pricing";
import { NormalizedSession, OptimizationInsight, SessionStep } from "@/src/types/session";

export interface WasteDetectionInput {
  session: NormalizedSession;
  totalContextInput: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  cacheHitRate: number;
  estimatedCostUsd: number;
  estimatedSavingsUsd: number;
  toolCallCount: number;
  errorCount: number;
  duplicateFileReads: Array<{ path: string; count: number }>;
}

function stepContextTokens(step: SessionStep): number {
  return step.usage.inputTokens + step.usage.cacheReadTokens + step.usage.cacheWriteTokens;
}

function detectOversizedSteps(steps: SessionStep[]): OptimizationInsight | null {
  if (steps.length === 0) return null;
  const avgContext = steps.reduce((sum, s) => sum + stepContextTokens(s), 0) / steps.length;

  const spikes = steps
    .map((step) => {
      const freshInput = step.usage.inputTokens + step.usage.cacheWriteTokens;
      const totalCtx = stepContextTokens(step);
      const isSpike = freshInput >= 15_000 || (steps.length >= 3 && totalCtx >= 40_000 && totalCtx >= avgContext * 2);
      return isSpike ? { index: step.index, tokens: Math.max(freshInput, totalCtx), tool: step.toolCalls[0]?.name } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.tokens - a.tokens);

  if (spikes.length === 0) return null;

  return {
    id: "oversized-steps",
    severity: "warning",
    title: `${spikes.length} step(s) caused a large token spike`,
    description: "Large file reads or verbose command outputs inflated context in a single turn.",
    action: "Fix: Read specific line ranges and pipe verbose commands through head, tail, or grep before returning output.",
    affectedItems: spikes.slice(0, 3).map((s) =>
      `Step #${s.index}${s.tool ? ` (${s.tool})` : ""}: ${(s.tokens / 1000).toFixed(1)}k tokens`
    ),
  };
}

function detectContextBloat(steps: SessionStep[]): OptimizationInsight | null {
  if (steps.length < 10) return null;
  const sliceSize = Math.max(2, Math.floor(steps.length / 3));
  const earlyAvg = steps.slice(0, sliceSize).reduce((sum, s) => sum + stepContextTokens(s), 0) / sliceSize;
  const lateAvg = steps.slice(-sliceSize).reduce((sum, s) => sum + stepContextTokens(s), 0) / sliceSize;

  const isBloated =
    (lateAvg >= earlyAvg * 2 && lateAvg >= 12_000) || (steps.length >= 20 && lateAvg >= 15_000);
  if (!isBloated) return null;

  return {
    id: "context-bloat",
    severity: "warning",
    title: `Context grew ${earlyAvg > 0 ? `${(lateAvg / earlyAvg).toFixed(1)}x` : "significantly"} over ${steps.length} steps`,
    description: "Long sessions re-send the entire conversation history on every turn, compounding input token cost.",
    action: "Fix: Compact/summarize the conversation mid-task or start a fresh session for the next subtask.",
    affectedItems: [
      `Early avg: ${(earlyAvg / 1000).toFixed(1)}k`,
      `Late avg: ${(lateAvg / 1000).toFixed(1)}k`,
    ],
  };
}

function detectToolLoops(steps: SessionStep[]): OptimizationInsight | null {
  const flatCalls = steps.flatMap((s) =>
    s.toolCalls.map((t) => ({ name: t.name, target: t.targetPath ?? "" }))
  );
  if (flatCalls.length < 3) return null;

  const loops = new Set<string>();
  let streak = 1;
  for (let i = 1; i < flatCalls.length; i += 1) {
    const prev = flatCalls[i - 1];
    const curr = flatCalls[i];
    if (curr.name === prev.name && curr.target === prev.target) {
      streak += 1;
      if (streak >= 3) {
        loops.add(`${curr.name}${curr.target ? ` (${curr.target})` : ""} x${streak}`);
      }
    } else {
      streak = 1;
    }
  }

  if (loops.size === 0) return null;

  return {
    id: "tool-loops",
    severity: "warning",
    title: "Repeated tool-call loop detected",
    description: "The agent ran the same tool on the same target 3+ times in a row without making progress.",
    action: "Fix: Interrupt retry loops early and supply exact error messages, paths, or constraints.",
    affectedItems: Array.from(loops).slice(0, 3),
  };
}

function detectIoImbalance(totalContextInput: number, totalOutputTokens: number): OptimizationInsight | null {
  if (totalContextInput <= 20_000) return null;
  const ratio = totalOutputTokens > 0 ? totalContextInput / totalOutputTokens : totalContextInput;
  if (ratio < 25) return null;

  return {
    id: "io-imbalance",
    severity: "info",
    title: `High input-to-output ratio (${Math.round(ratio)}:1)`,
    description: "Large amounts of context are being carried every turn to produce relatively small outputs.",
    action: "Fix: Exclude unrelated files/logs from context and batch related questions into fewer turns.",
  };
}

function detectModelMismatch(input: WasteDetectionInput): OptimizationInsight | null {
  const pricing = getModelPricing(input.session.model);
  if (pricing.inputPerMillion < 4 || input.estimatedCostUsd < 0.02) return null;

  const assistantSteps = input.session.steps.filter((s) => s.role === "assistant");
  const avgOutput =
    assistantSteps.length > 0 ? input.totalOutputTokens / assistantSteps.length : input.totalOutputTokens;
  if (avgOutput > 450 && input.toolCallCount < 6) return null;

  const potentialSavings = input.estimatedCostUsd * 0.5;
  return {
    id: "model-mismatch",
    severity: "info",
    title: `Premium model (${input.session.model}) used for routine steps`,
    description: "Short responses and file-exploration turns do not require top-tier reasoning pricing.",
    action: "Fix: Route exploration and routine edits to a lighter/faster model tier, saving flagship models for planning.",
    savingsEstimate: `~${formatUsd(potentialSavings)} potential`,
  };
}

export function detectWasteInsights(input: WasteDetectionInput): OptimizationInsight[] {
  const insights: OptimizationInsight[] = [];
  const { session, totalContextInput, totalCacheReadTokens, cacheHitRate, estimatedSavingsUsd } = input;

  if (cacheHitRate >= 60) {
    insights.push({
      id: "cache-strong",
      severity: "success",
      title: `Prompt cache is working well (${cacheHitRate.toFixed(1)}% reused)`,
      description: `${totalCacheReadTokens.toLocaleString("en-US")} tokens were reused from cache instead of being billed at full input rates.`,
      action: "Keep static rules (like AGENTS.md) at the top of your prompt to maintain these savings.",
      savingsEstimate: `~${formatUsd(estimatedSavingsUsd)} saved`,
    });
  } else if (totalContextInput > 5000) {
    insights.push({
      id: "cache-low",
      severity: "warning",
      title: `Prompt cache is underused (${cacheHitRate.toFixed(1)}% reused)`,
      description: "The AI is re-reading your background context at full price on every turn instead of reusing cached prefixes.",
      action: "Fix: Put static project rules at the top of your prompt and avoid editing system instructions mid-session.",
    });
  }

  const oversized = detectOversizedSteps(session.steps);
  if (oversized) insights.push(oversized);

  const bloat = detectContextBloat(session.steps);
  if (bloat) insights.push(bloat);

  if (input.duplicateFileReads.length > 0) {
    insights.push({
      id: "dup-reads",
      severity: "warning",
      title: `${input.duplicateFileReads.length} file(s) were read multiple times`,
      description: "Re-reading the same file adds redundant output tokens to the conversation.",
      action: "Fix: Point the AI to specific line ranges or ask it to summarize key files once instead of re-opening them.",
      affectedItems: input.duplicateFileReads.slice(0, 3).map((item) => `${item.path} (${item.count}x)`),
    });
  }

  const loops = detectToolLoops(session.steps);
  if (loops) insights.push(loops);

  const imbalance = detectIoImbalance(totalContextInput, input.totalOutputTokens);
  if (imbalance) insights.push(imbalance);

  const modelMismatch = detectModelMismatch(input);
  if (modelMismatch) insights.push(modelMismatch);

  if (input.errorCount > 0) {
    insights.push({
      id: "tool-errors",
      severity: "info",
      title: `${input.errorCount} command/tool call(s) failed`,
      description: "Each failed step forces the AI to spend extra turns and tokens figuring out what went wrong.",
      action: "Fix: Provide exact file paths, scripts, or environment requirements upfront so commands succeed on the first try.",
    });
  }

  return insights;
}
