import {
  HarnessType,
  NormalizedSession,
  SessionStep,
  StepRole,
  TokenUsage,
  ToolCallRecord,
} from "@/src/types/session";
import { isAntigravityRecord, parseAntigravityRecord } from "./antigravityParser";
import {
  isCodexRecord,
  isOpenCodeRecord,
  parseCodexRecord,
  parseOpenCodeRecord,
} from "./harnessAdapters";

interface RawJsonRecord {
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

function extractUsage(raw: RawJsonRecord): TokenUsage {
  const u = raw.message?.usage ?? raw.usage ?? {};
  return {
    inputTokens: Number(u.input_tokens ?? u.inputTokens ?? u.prompt_tokens ?? 0),
    outputTokens: Number(u.output_tokens ?? u.outputTokens ?? u.completion_tokens ?? 0),
    cacheReadTokens: Number(u.cache_read_input_tokens ?? u.cacheReadTokens ?? u.cached_tokens ?? 0),
    cacheWriteTokens: Number(u.cache_creation_input_tokens ?? u.cacheWriteTokens ?? 0),
  };
}

function extractTextAndTools(content: unknown): { text: string; tools: ToolCallRecord[] } {
  if (typeof content === "string") {
    return { text: content, tools: [] };
  }
  if (!Array.isArray(content)) {
    return { text: "", tools: [] };
  }

  const textParts: string[] = [];
  const tools: ToolCallRecord[] = [];

  for (const block of content) {
    if (!block || typeof block !== "object") continue;
    const item = block as Record<string, unknown>;
    if (item.type === "text" && typeof item.text === "string") {
      textParts.push(item.text);
    } else if (item.type === "tool_use" || item.type === "function_call") {
      const input = item.input ?? item.arguments ?? {};
      const inputRecord = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
      const targetPath =
        (inputRecord.file_path as string | undefined) ??
        (inputRecord.path as string | undefined) ??
        (inputRecord.AbsolutePath as string | undefined);
      tools.push({
        id: String(item.id ?? `tool-${tools.length + 1}`),
        name: String(item.name ?? "tool_call"),
        targetPath,
        argumentsPreview: JSON.stringify(input, null, 2).slice(0, 400),
        status: "success",
      });
    }
  }

  return { text: textParts.join("\n").trim(), tools };
}

function detectHarness(lines: RawJsonRecord[]): HarnessType {
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

function normalizeRole(raw: RawJsonRecord): StepRole {
  const role = raw.message?.role ?? raw.role ?? raw.type ?? "assistant";
  if (role === "user" || role === "human") return "user";
  if (role === "tool" || role === "tool_result") return "tool";
  if (role === "system") return "system";
  return "assistant";
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

function isSessionRecord(value: unknown): value is RawJsonRecord {
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

export function parseJsonlSession(rawText: string, fileName: string): NormalizedSession {
  const records: RawJsonRecord[] = [];
  for (const line of rawText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (isSessionRecord(parsed)) {
        records.push(parsed);
      }
    } catch {
      // Skip malformed lines without failing the entire transcript
    }
  }

  const steps: SessionStep[] = records.map((raw, idx) => {
    const rawRecord = raw as Record<string, unknown>;
    if (isAntigravityRecord(rawRecord)) {
      return parseAntigravityRecord(rawRecord, idx);
    }
    if (isCodexRecord(rawRecord)) {
      return parseCodexRecord(rawRecord, idx);
    }
    if (isOpenCodeRecord(rawRecord)) {
      return parseOpenCodeRecord(rawRecord, idx);
    }
    const role = normalizeRole(raw);
    const { text, tools } = extractTextAndTools(raw.message?.content ?? "");
    const summarySource = text || (tools.length > 0 ? `${tools.length} tool call(s) executed` : raw.type ?? "Step");
    return {
      id: `step-${idx + 1}`,
      index: idx + 1,
      role,
      timestamp: raw.timestamp ?? new Date().toISOString(),
      model: raw.message?.model ?? raw.model,
      summary: summarySource.slice(0, 120),
      content: text || undefined,
      usage: extractUsage(raw),
      durationMs: raw.durationMs,
      toolCalls: tools,
    };
  });

  const detectedModel = steps.find((s) => s.model)?.model ?? "claude-sonnet-4";

  return {
    id: `uploaded-${Date.now()}`,
    title: fileName.replace(/\.jsonl$/i, ""),
    harness: detectHarness(records),
    model: detectedModel,
    createdAt: steps[0]?.timestamp ?? new Date().toISOString(),
    source: "uploaded",
    steps,
  };
}
