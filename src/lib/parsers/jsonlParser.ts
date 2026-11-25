import { NormalizedSession, SessionStep } from "@/src/types/session";
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
