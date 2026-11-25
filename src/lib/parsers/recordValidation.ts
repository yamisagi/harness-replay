import { HarnessType } from "@/src/types/session";
import { isAntigravityRecord } from "./antigravityParser";
import { isCodexRecord, isOpenCodeRecord } from "./harnessAdapters";

export interface RawJsonRecord {
  type?: string;
  role?: string;
  timestamp?: string;
  model?: string;
  message?: {
    role?: string;
    model?: string;
    content?: unknown;
    usage?: Record<string, number>;
  };
  usage?: Record<string, number>;
  toolUseResult?: unknown;
  durationMs?: number;
}

const KNOWN_ROLES = new Set([
  "user",
  "human",
  "assistant",
  "tool",
  "tool_result",
  "system",
  "developer",
  "model",
]);

const USAGE_KEYS = [
  "input_tokens",
  "inputTokens",
  "prompt_tokens",
  "output_tokens",
  "outputTokens",
  "completion_tokens",
  "cache_read_input_tokens",
  "cacheReadTokens",
  "cached_tokens",
  "cache_creation_input_tokens",
  "cacheWriteTokens",
];

function hasUsageFields(obj: unknown): boolean {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  const record = obj as Record<string, unknown>;
  return USAGE_KEYS.some((key) => typeof record[key] === "number");
}

/** Validates that a parsed JSON line represents an AI session record rather than an arbitrary JSON file. */
export function isSessionRecord(value: unknown): value is RawJsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const raw = value as Record<string, unknown>;
  if (isAntigravityRecord(raw) || isCodexRecord(raw) || isOpenCodeRecord(raw)) return true;

  if (raw.message && typeof raw.message === "object" && !Array.isArray(raw.message)) {
    const msg = raw.message as Record<string, unknown>;
    if (
      (typeof msg.role === "string" && KNOWN_ROLES.has(msg.role.toLowerCase())) ||
      msg.content !== undefined ||
      hasUsageFields(msg.usage)
    ) {
      return true;
    }
  }

  if (typeof raw.role === "string" && KNOWN_ROLES.has(raw.role.toLowerCase())) {
    return true;
  }

  if (hasUsageFields(raw.usage) || raw.toolUseResult !== undefined) {
    return true;
  }

  if (
    typeof raw.type === "string" &&
    KNOWN_ROLES.has(raw.type.toLowerCase()) &&
    (raw.content !== undefined || raw.timestamp !== undefined || raw.model !== undefined)
  ) {
    return true;
  }

  return false;
}

/** Detects which AI coding harness produced the parsed session records. */
export function detectHarness(lines: RawJsonRecord[]): HarnessType {
  if (lines.some((line) => isAntigravityRecord(line as Record<string, unknown>))) {
    return "antigravity";
  }
  if (lines.some((line) => isCodexRecord(line as Record<string, unknown>))) {
    return "codex";
  }
  if (lines.some((line) => isOpenCodeRecord(line as Record<string, unknown>))) {
    return "opencode";
  }
  const sample = JSON.stringify(lines.slice(0, 5)).toLowerCase();
  if (sample.includes("claude")) return "claude-code";
  if (sample.includes("codex") || sample.includes("gpt-")) return "codex";
  if (sample.includes("antigravity") || sample.includes("gemini")) return "antigravity";
  if (sample.includes("opencode")) return "opencode";
  return "generic";
}
