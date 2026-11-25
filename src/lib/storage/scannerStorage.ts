import type { ScannedSessionMeta } from "@/src/lib/server/localSessionScanner";

const STORAGE_KEY = "harness-replay:local-scanner:v1";
const MAX_DIRS = 20;
const MAX_SCANNED = 100;

export interface StoredScannerState {
  selectedDirs: string[];
  customDirs: string[];
  scanned: ScannedSessionMeta[];
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && item.trim().length > 0);
}

function isScannedMeta(value: unknown): value is ScannedSessionMeta {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.filePath === "string" &&
    typeof v.fileName === "string" &&
    typeof v.harness === "string" &&
    typeof v.title === "string" &&
    typeof v.modifiedAt === "string" &&
    typeof v.stepCount === "number" &&
    typeof v.sizeBytes === "number"
  );
}

export function loadScannerState(): StoredScannerState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    const record = parsed as Record<string, unknown>;
    const selectedDirs = isStringArray(record.selectedDirs) ? record.selectedDirs.slice(0, MAX_DIRS) : [];
    const customDirs = isStringArray(record.customDirs) ? record.customDirs.slice(0, MAX_DIRS) : [];
    const scanned = Array.isArray(record.scanned)
      ? record.scanned.filter(isScannedMeta).slice(0, MAX_SCANNED)
      : [];

    return { selectedDirs, customDirs, scanned };
  } catch {
    return null;
  }
}

export function saveScannerState(state: StoredScannerState): void {
  if (typeof window === "undefined") return;
  try {
    const payload: StoredScannerState = {
      selectedDirs: state.selectedDirs.slice(0, MAX_DIRS),
      customDirs: state.customDirs.slice(0, MAX_DIRS),
      scanned: state.scanned.slice(0, MAX_SCANNED),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota or private browsing errors
  }
}
