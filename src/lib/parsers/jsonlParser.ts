import { NormalizedSession, SessionStep, ToolCallRecord } from "@/src/types/session";
import { isAntigravityRecord, parseAntigravityRecord } from "./antigravityParser";
import { deriveSessionTitle, parseGenericRecord } from "./genericStepParser";
import {
  isCodexRecord,
  isOpenCodeRecord,
  parseCodexRecord,
  parseOpenCodeRecord,
} from "./harnessAdapters";
import { detectHarness, isSessionRecord, RawJsonRecord } from "./recordValidation";

function normalizeRecord(raw: RawJsonRecord, idx: number): SessionStep {
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
  return parseGenericRecord(raw, idx);
}

function extractToolResultText(content: unknown): string | undefined {
  if (typeof content === "string") {
    return content.trim().slice(0, 400) || undefined;
  }
  if (!Array.isArray(content)) return undefined;
  const text = content
    .map((item) =>
      item && typeof item === "object" && (item as Record<string, unknown>).type === "text"
        ? String((item as Record<string, unknown>).text ?? "")
        : ""
    )
    .filter(Boolean)
    .join("\n")
    .trim();
  return text ? text.slice(0, 400) : undefined;
}

function collectToolResults(
  records: RawJsonRecord[]
): Map<string, { isError: boolean; outputPreview?: string }> {
  const resultMap = new Map<string, { isError: boolean; outputPreview?: string }>();
  for (const raw of records) {
    if (Array.isArray(raw.message?.content)) {
      for (const block of raw.message.content) {
        if (!block || typeof block !== "object") continue;
        const b = block as Record<string, unknown>;
        if (b.type === "tool_result" && typeof b.tool_use_id === "string") {
          resultMap.set(b.tool_use_id, {
            isError: b.is_error === true,
            outputPreview: extractToolResultText(b.content),
          });
        }
      }
    }
    const rec = raw as Record<string, unknown>;
    if (isCodexRecord(rec)) {
      const payload = rec.payload as Record<string, unknown>;
      const ptype = String(payload.type ?? "");
      if (
        (ptype === "function_call_output" || ptype === "custom_tool_call_output") &&
        typeof payload.call_id === "string"
      ) {
        const out = typeof payload.output === "string" ? payload.output.trim().slice(0, 400) : "";
        resultMap.set(payload.call_id, {
          isError: payload.is_error === true,
          outputPreview: out || undefined,
        });
      }
    }
  }
  return resultMap;
}

function markRemainingPending(pendingCalls: ToolCallRecord[], cursor: number): void {
  for (let j = cursor; j < pendingCalls.length; j += 1) {
    if (pendingCalls[j].status === "success" && !pendingCalls[j].outputPreview) {
      pendingCalls[j].status = "pending";
    }
  }
}

function reconcileAntigravityResults(records: RawJsonRecord[], steps: SessionStep[]): void {
  let pendingCalls: ToolCallRecord[] = [];
  let cursor = 0;

  for (let i = 0; i < records.length; i += 1) {
    const rec = records[i] as Record<string, unknown>;
    if (!isAntigravityRecord(rec)) continue;

    if (rec.type === "PLANNER_RESPONSE" || Array.isArray(rec.tool_calls)) {
      markRemainingPending(pendingCalls, cursor);
      pendingCalls = steps[i]?.toolCalls ?? [];
      cursor = 0;
    } else if (rec.type === "GENERIC" && cursor < pendingCalls.length) {
      const tool = pendingCalls[cursor];
      cursor += 1;
      const isErr = rec.status === "ERROR" || (typeof rec.error === "string" && rec.error.length > 0);
      tool.status = isErr ? "error" : "success";
      if (!tool.outputPreview) {
        const out =
          typeof rec.error === "string" && rec.error.trim()
            ? rec.error.trim()
            : typeof rec.content === "string"
            ? rec.content.trim()
            : "";
        if (out) tool.outputPreview = out.slice(0, 400);
      }
    } else if (rec.type === "USER_INPUT") {
      markRemainingPending(pendingCalls, cursor);
      pendingCalls = [];
      cursor = 0;
    }
  }

  markRemainingPending(pendingCalls, cursor);
}

function reconcileToolCallStatuses(records: RawJsonRecord[], steps: SessionStep[]): void {
  reconcileAntigravityResults(records, steps);
  const resultMap = collectToolResults(records);

  for (let i = 0; i < steps.length; i += 1) {
    const rec = records[i] as Record<string, unknown>;
    if (isAntigravityRecord(rec) || isOpenCodeRecord(rec)) continue;

    for (const tool of steps[i].toolCalls) {
      const res = resultMap.get(tool.id);
      if (res) {
        tool.status = res.isError ? "error" : "success";
        if (!tool.outputPreview && res.outputPreview) tool.outputPreview = res.outputPreview;
      } else if (tool.status !== "error" && !tool.outputPreview) {
        tool.status = "pending";
      }
    }
  }
}

/** Parses a multi-harness JSONL transcript into a NormalizedSession. */
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

  const steps = records.map((raw, idx) => normalizeRecord(raw, idx));
  reconcileToolCallStatuses(records, steps);
  const detectedModel = steps.find((s) => s.model)?.model ?? "claude-sonnet-4";

  return {
    id: `uploaded-${Date.now()}`,
    title: deriveSessionTitle(records, steps, fileName),
    harness: detectHarness(records),
    model: detectedModel,
    createdAt: steps[0]?.timestamp ?? new Date().toISOString(),
    source: "uploaded",
    steps,
  };
}
