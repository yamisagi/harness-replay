import { SessionStep, StepRole, TokenUsage, ToolCallRecord } from "@/src/types/session";
import { RawJsonRecord } from "./recordValidation";

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

function normalizeRole(raw: RawJsonRecord): StepRole {
  const role = raw.message?.role ?? raw.role ?? raw.type ?? "assistant";
  if (role === "user" || role === "human") return "user";
  if (role === "tool" || role === "tool_result") return "tool";
  if (role === "system") return "system";
  return "assistant";
}

/** Normalizes a Claude Code or generic JSONL record into a SessionStep. */
export function parseGenericRecord(raw: RawJsonRecord, idx: number): SessionStep {
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
}

/** Derives a human-readable session title from explicit metadata, the first user prompt, or the file name. */
export function deriveSessionTitle(
  records: RawJsonRecord[],
  steps: SessionStep[],
  fileName: string
): string {
  for (const raw of records) {
    const rec = raw as Record<string, unknown>;
    const explicit = rec.title ?? rec.conversation_title ?? rec.session_title;
    if (typeof explicit === "string" && explicit.trim().length > 0) {
      return explicit.trim().slice(0, 72);
    }
  }

  const firstUser = steps.find((s) => s.role === "user" && (s.content || s.summary));
  if (firstUser) {
    const cleaned = (firstUser.content ?? firstUser.summary)
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (cleaned.length > 0 && cleaned !== "USER_INPUT" && cleaned !== "Step") {
      return cleaned.length > 64 ? `${cleaned.slice(0, 64)}…` : cleaned;
    }
  }

  return fileName.replace(/\.(jsonl|json|txt)$/i, "");
}
