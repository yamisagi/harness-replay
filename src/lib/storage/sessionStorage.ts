import { NormalizedSession } from "@/src/types/session";
import { deleteSessionFromDb, getAllSessionsFromDb, putSessionsInDb } from "./sessionDb";

const LEGACY_UPLOADED_KEY = "harness-replay:uploaded-sessions:v1";
const DISMISSED_DEMOS_KEY = "harness-replay:dismissed-demos:v1";
const CUSTOM_TITLES_KEY = "harness-replay:session-titles:v1";

function isValidStoredSession(value: unknown): value is NormalizedSession {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.id === "string" &&
    typeof s.title === "string" &&
    typeof s.harness === "string" &&
    typeof s.model === "string" &&
    Array.isArray(s.steps)
  );
}

function dedupeSessions(sessions: NormalizedSession[]): NormalizedSession[] {
  const seen = new Set<string>();
  const unique: NormalizedSession[] = [];
  for (const s of sessions) {
    if (!isValidStoredSession(s) || seen.has(s.id)) continue;
    seen.add(s.id);
    unique.push(s);
  }
  return unique;
}

export function loadStoredMeta(): {
  dismissedDemoIds: string[];
  customTitles: Record<string, string>;
} {
  if (typeof window === "undefined") {
    return { dismissedDemoIds: [], customTitles: {} };
  }

  let dismissedDemoIds: string[] = [];
  let customTitles: Record<string, string> = {};

  try {
    const rawDismissed = window.localStorage.getItem(DISMISSED_DEMOS_KEY);
    if (rawDismissed) {
      const parsed: unknown = JSON.parse(rawDismissed);
      if (Array.isArray(parsed)) {
        dismissedDemoIds = parsed.filter((id): id is string => typeof id === "string");
      }
    }
  } catch {
    dismissedDemoIds = [];
  }

  try {
    const rawTitles = window.localStorage.getItem(CUSTOM_TITLES_KEY);
    if (rawTitles) {
      const parsed: unknown = JSON.parse(rawTitles);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === "string" && v.trim()) customTitles[k] = v.trim();
        }
      }
    }
  } catch {
    customTitles = {};
  }

  return { dismissedDemoIds, customTitles };
}

export async function loadPersistedSessions(): Promise<NormalizedSession[]> {
  if (typeof window === "undefined") return [];

  const dbSessions = dedupeSessions(await getAllSessionsFromDb());

  try {
    const rawLegacy = window.localStorage.getItem(LEGACY_UPLOADED_KEY);
    if (rawLegacy) {
      const parsed: unknown = JSON.parse(rawLegacy);
      if (Array.isArray(parsed)) {
        const legacyValid = dedupeSessions(parsed as NormalizedSession[]);
        const existingIds = new Set(dbSessions.map((s) => s.id));
        const toMigrate = legacyValid.filter((s) => !existingIds.has(s.id));
        if (toMigrate.length > 0) {
          await putSessionsInDb(toMigrate);
          window.localStorage.removeItem(LEGACY_UPLOADED_KEY);
          return dedupeSessions([...dbSessions, ...toMigrate]);
        }
      }
      window.localStorage.removeItem(LEGACY_UPLOADED_KEY);
    }
  } catch {
    // Ignore malformed legacy storage
  }

  return dbSessions;
}

export async function persistImportedSessions(sessions: NormalizedSession[]): Promise<boolean> {
  return putSessionsInDb(dedupeSessions(sessions));
}

export async function removePersistedSession(id: string): Promise<void> {
  await deleteSessionFromDb(id);
}

export function saveDismissedDemos(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DISMISSED_DEMOS_KEY, JSON.stringify(ids));
  } catch {
    // Ignore storage write errors for non-critical demo dismissal state
  }
}

export function saveCustomTitles(titles: Record<string, string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CUSTOM_TITLES_KEY, JSON.stringify(titles));
  } catch {
    // Ignore storage write errors for non-critical custom title state
  }
}
