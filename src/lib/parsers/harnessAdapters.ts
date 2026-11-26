import { SessionStep, StepRole, TokenUsage, ToolCallRecord } from "@/src/types/session";

const CODEX_TYPES = new Set(["response_item", "event_msg", "session_meta", "turn_context"]);

export function isCodexRecord(raw: Record<string, unknown>): boolean {
  return (
    typeof raw.type === "string" &&
    CODEX_TYPES.has(raw.type) &&
    Boolean(raw.payload && typeof raw.payload === "object" && !Array.isArray(raw.payload))
  );
}

export function isOpenCodeRecord(raw: Record<string, unknown>): boolean {
  return Boolean(
    raw.part &&
      typeof raw.part === "object" &&
      !Array.isArray(raw.part) &&
      (typeof raw.sessionID === "string" || typeof raw.type === "string")
  );
}

function extractCodexText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const b = item as Record<string, unknown>;
      if (typeof b.text === "string") return b.text;
      if (typeof b.output_text === "string") return b.output_text;
      if (typeof b.input_text === "string") return b.input_text;
      return "";
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}

export function parseCodexRecord(raw: Record<string, unknown>, idx: number): SessionStep {
  const payload = raw.payload as Record<string, unknown>;
  const timestamp = typeof raw.timestamp === "string" ? raw.timestamp : new Date().toISOString();
  const emptyUsage: TokenUsage = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  };

  if (raw.type === "event_msg" && payload.type === "token_count") {
    const info = (payload.info ?? {}) as Record<string, unknown>;
    const u = ((info.last_token_usage ?? info.total_token_usage ?? {}) as Record<string, unknown>);
    return {
      id: `step-${idx + 1}`,
      index: idx + 1,
      role: "assistant",
      timestamp,
      summary: "Token usage snapshot",
      usage: {
        inputTokens: Number(u.input_tokens ?? 0),
        outputTokens: Number(u.output_tokens ?? 0),
        cacheReadTokens: Number(u.cached_input_tokens ?? 0),
        cacheWriteTokens: 0,
      },
      toolCalls: [],
    };
  }

  const ptype = String(payload.type ?? "");
  const isToolCall = ptype === "function_call" || ptype === "custom_tool_call";
  const isToolOut = ptype === "function_call_output" || ptype === "custom_tool_call_output";

  const toolCalls: ToolCallRecord[] = isToolCall
    ? [
        {
          id: String(payload.call_id ?? `codex-tool-${idx + 1}`),
          name: String(payload.name ?? "tool_call"),
          argumentsPreview: String(payload.arguments ?? payload.input ?? "{}").slice(0, 400),
          status: "success",
        },
      ]
    : [];

  const text = isToolOut
    ? String(payload.output ?? "")
    : extractCodexText(payload.content ?? payload.message ?? payload.text ?? "");
  const role: StepRole =
    raw.type === "session_meta" || raw.type === "turn_context"
      ? "system"
      : isToolOut
      ? "tool"
      : payload.role === "user" || ptype === "user_message"
      ? "user"
      : "assistant";

  const summary = text || (toolCalls[0] ? `${toolCalls[0].name} called` : ptype || String(raw.type));
  return {
    id: `step-${idx + 1}`,
    index: idx + 1,
    role,
    timestamp,
    model: typeof payload.model === "string" ? payload.model : undefined,
    summary: summary.slice(0, 120),
    content: text || undefined,
    usage: emptyUsage,
    toolCalls,
  };
}

export function parseOpenCodeRecord(raw: Record<string, unknown>, idx: number): SessionStep {
  const part = raw.part as Record<string, unknown>;
  const timestamp =
    typeof raw.timestamp === "number"
      ? new Date(raw.timestamp).toISOString()
      : typeof raw.timestamp === "string"
      ? raw.timestamp
      : new Date().toISOString();

  const tokens = (part.tokens ?? {}) as Record<string, unknown>;
  const cache = (tokens.cache ?? {}) as Record<string, unknown>;
  const usage: TokenUsage = {
    inputTokens: Number(tokens.input ?? tokens.prompt ?? 0),
    outputTokens: Number(tokens.output ?? tokens.completion ?? 0),
    cacheReadTokens: Number(cache.read ?? 0),
    cacheWriteTokens: Number(cache.write ?? 0),
  };

  const state = (part.state ?? {}) as Record<string, unknown>;
  const rawStateStatus = typeof state.status === "string" ? state.status.toLowerCase() : "";
  const rawOpenCodeOutput =
    typeof state.output === "string"
      ? state.output
      : typeof state.error === "string"
      ? state.error
      : undefined;
  const openCodeStatus: ToolCallRecord["status"] =
    rawStateStatus === "error"
      ? "error"
      : rawStateStatus === "pending" ||
        rawStateStatus === "running" ||
        (!rawOpenCodeOutput && rawStateStatus !== "completed")
      ? "pending"
      : "success";

  const toolCalls: ToolCallRecord[] =
    part.type === "tool" || typeof part.tool === "string"
      ? [
          {
            id: String(part.id ?? `oc-tool-${idx + 1}`),
            name: String(part.tool ?? "tool_call"),
            argumentsPreview: JSON.stringify(state.input ?? {}, null, 2).slice(0, 400),
            outputPreview: rawOpenCodeOutput ? rawOpenCodeOutput.slice(0, 400) : undefined,
            status: openCodeStatus,
          },
        ]
      : [];

  const text = typeof part.text === "string" ? part.text.trim() : "";
  const role: StepRole = raw.type === "user" ? "user" : toolCalls.length > 0 ? "tool" : "assistant";
  const summary = text || (toolCalls[0] ? `${toolCalls[0].name} executed` : String(raw.type ?? "Step"));

  return {
    id: `step-${idx + 1}`,
    index: idx + 1,
    role,
    timestamp,
    summary: summary.slice(0, 120),
    content: text || undefined,
    usage,
    toolCalls,
  };
}
