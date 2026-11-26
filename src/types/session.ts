export type HarnessType = "claude-code" | "codex" | "opencode" | "antigravity" | "generic";

export type StepRole = "user" | "assistant" | "tool" | "system";

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export type ToolCallStatus = "success" | "error" | "pending";

export interface ToolCallRecord {
  id: string;
  name: string;
  targetPath?: string;
  argumentsPreview: string;
  outputPreview?: string;
  status: ToolCallStatus;
  durationMs?: number;
}

export interface SessionStep {
  id: string;
  index: number;
  role: StepRole;
  timestamp: string;
  model?: string;
  summary: string;
  content?: string;
  usage: TokenUsage;
  durationMs?: number;
  toolCalls: ToolCallRecord[];
}

export interface NormalizedSession {
  id: string;
  title: string;
  harness: HarnessType;
  model: string;
  createdAt: string;
  source: "demo" | "uploaded";
  steps: SessionStep[];
}

export interface OptimizationInsight {
  id: string;
  severity: "info" | "warning" | "success";
  title: string;
  description: string;
  action?: string;
  affectedItems?: string[];
  savingsEstimate?: string;
}

export interface SessionAnalytics {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  totalCacheWriteTokens: number;
  totalTokens: number;
  cacheHitRate: number;
  estimatedCostUsd: number;
  estimatedSavingsUsd: number;
  totalDurationMs: number;
  toolCallCount: number;
  errorCount: number;
  duplicateFileReads: Array<{ path: string; count: number }>;
  insights: OptimizationInsight[];
}
