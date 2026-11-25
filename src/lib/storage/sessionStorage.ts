import { NormalizedSession } from "@/src/types/session";

const UPLOADED_KEY = "harness-replay:uploaded-sessions:v1";
const DISMISSED_DEMOS_KEY = "harness-replay:dismissed-demos:v1";

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

export function loadStoredSessionState(): {
  uploaded: NormalizedSession[];
  dismissedDemoIds: string[];
} {
  if (typeof window === "undefined") {
    return { uploaded: [], dismissedDemoIds: [] };
  }

  let uploaded: NormalizedSession[] = [];
  let dismissedDemoIds: string[] = [];

  try {
    const rawUploaded = window.localStorage.getItem(UPLOADED_KEY);
    if (rawUploaded) {
      const parsed: unknown = JSON.parse(rawUploaded);
      if (Array.isArray(parsed)) {
        uploaded = parsed.filter(isValidStoredSession);
      }
    }
  } catch {
    uploaded = [];
  }

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

  return { uploaded, dismissedDemoIds };
}

export function saveUploadedSessions(sessions: NormalizedSession[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(UPLOADED_KEY, JSON.stringify(sessions));
    return true;
  } catch {
    return false;
  }
}

export function saveDismissedDemos(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DISMISSED_DEMOS_KEY, JSON.stringify(ids));
  } catch {
    // Ignore storage write errors for non-critical demo dismissal state
  }
}
