import { calculateUsageCost } from "@/src/lib/pricing";
import { NormalizedSession, SessionAnalytics } from "@/src/types/session";
import { detectWasteInsights } from "./wasteDetectors";

const READ_TOOL_NAMES = /read_file|view_file|read|cat|open_file/i;

export function analyzeSession(session: NormalizedSession): SessionAnalytics {
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheReadTokens = 0;
  let totalCacheWriteTokens = 0;
  let estimatedCostUsd = 0;
  let estimatedSavingsUsd = 0;
  let totalDurationMs = 0;
  let toolCallCount = 0;
  let errorCount = 0;

  const fileReadCounts = new Map<string, number>();

  for (const step of session.steps) {
    totalInputTokens += step.usage.inputTokens;
    totalOutputTokens += step.usage.outputTokens;
    totalCacheReadTokens += step.usage.cacheReadTokens;
    totalCacheWriteTokens += step.usage.cacheWriteTokens;
    totalDurationMs += step.durationMs ?? 0;

    const stepModel = step.model ?? session.model;
    const { costUsd, savingsUsd } = calculateUsageCost(step.usage, stepModel);
    estimatedCostUsd += costUsd;
    estimatedSavingsUsd += savingsUsd;

    for (const tool of step.toolCalls) {
      toolCallCount += 1;
      if (tool.status === "error") errorCount += 1;
      if (tool.targetPath && READ_TOOL_NAMES.test(tool.name)) {
        fileReadCounts.set(tool.targetPath, (fileReadCounts.get(tool.targetPath) ?? 0) + 1);
      }
    }
  }

  const totalContextInput = totalInputTokens + totalCacheReadTokens + totalCacheWriteTokens;
  const cacheHitRate = totalContextInput > 0 ? (totalCacheReadTokens / totalContextInput) * 100 : 0;
  const totalTokens = totalContextInput + totalOutputTokens;

  const duplicateFileReads = Array.from(fileReadCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count);

  const insights = detectWasteInsights({
    session,
    totalContextInput,
    totalOutputTokens,
    totalCacheReadTokens,
    cacheHitRate,
    estimatedCostUsd,
    estimatedSavingsUsd,
    toolCallCount,
    errorCount,
    duplicateFileReads,
  });

  return {
    totalInputTokens,
    totalOutputTokens,
    totalCacheReadTokens,
    totalCacheWriteTokens,
    totalTokens,
    cacheHitRate,
    estimatedCostUsd,
    estimatedSavingsUsd,
    totalDurationMs,
    toolCallCount,
    errorCount,
    duplicateFileReads,
    insights,
  };
}
