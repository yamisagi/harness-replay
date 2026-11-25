import { SessionStep, ToolCallRecord } from "@/src/types/session";

const AGY_TYPES = new Set(["USER_INPUT", "PLANNER_RESPONSE", "GENERIC", "CHECKPOINT"]);

export function isAntigravityRecord(raw: Record<string, unknown>): boolean {
  if (typeof raw.step_index !== "number") return false;
  if (typeof raw.type === "string" && AGY_TYPES.has(raw.type)) return true;
  return (
    typeof raw.input_tokens === "number" ||
    typeof raw.output_tokens === "number" ||
    Array.isArray(raw.tool_calls)
  );
}

function cleanUserContent(rawText: string): string {
  const match = rawText.match(/<USER_REQUEST>\s*([\s\S]*?)\s*<\/USER_REQUEST>/);
  return match ? match[1].trim() : rawText.trim();
}

function extractAgyToolCalls(raw: Record<string, unknown>, stepIdx: number): ToolCallRecord[] {
  if (!Array.isArray(raw.tool_calls)) return [];
  const isError = raw.status === "ERROR";

  return raw.tool_calls
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item, idx) => {
      const args =
        item.args && typeof item.args === "object" && !Array.isArray(item.args)
          ? (item.args as Record<string, unknown>)
          : {};
      const targetPath =
        (args.Path as string | undefined) ??
        (args.AbsolutePath as string | undefined) ??
        (args.file_path as string | undefined) ??
        (args.path as string | undefined);

      return {
        id: `agy-${stepIdx}-tool-${idx + 1}`,
        name: String(item.name ?? "tool_call"),
        targetPath,
        argumentsPreview: JSON.stringify(args, null, 2).slice(0, 400),
        status: isError ? "error" : "success",
      };
    });
}

export function parseAntigravityRecord(raw: Record<string, unknown>, idx: number): SessionStep {
  const isUser = raw.type === "USER_INPUT" || raw.source === "USER_EXPLICIT";
  const isToolOutput = raw.type === "GENERIC";
  const role = isUser ? "user" : isToolOutput ? "tool" : "assistant";

  const rawContent = typeof raw.content === "string" ? cleanUserContent(raw.content) : "";
  const thinking = typeof raw.thinking === "string" ? raw.thinking.trim() : "";
  const text = rawContent || thinking;
  const toolCalls = extractAgyToolCalls(raw, idx + 1);

  const summarySource =
    text || (toolCalls.length > 0 ? `${toolCalls.length} tool call(s) executed` : String(raw.type ?? "Step"));

  return {
    id: `step-${idx + 1}`,
    index: idx + 1,
    role,
    timestamp: typeof raw.created_at === "string" ? raw.created_at : new Date().toISOString(),
    model: typeof raw.model === "string" ? raw.model : undefined,
    summary: summarySource.slice(0, 120),
    content: text || undefined,
    usage: {
      inputTokens: Number(raw.input_tokens ?? 0),
      outputTokens: Number(raw.output_tokens ?? 0),
      cacheReadTokens: Number(raw.cache_read_tokens ?? 0),
      cacheWriteTokens: Number(raw.cache_write_tokens ?? 0),
    },
    toolCalls,
  };
}
