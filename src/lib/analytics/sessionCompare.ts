import { NormalizedSession, SessionAnalytics } from "@/src/types/session";

export type BetterSide = "left" | "right" | "tie";
export type TaskMatchQuality = "exact" | "similar" | "different";

export interface MetricDelta {
  left: number;
  right: number;
  delta: number;
  deltaPct: number | null;
  better: BetterSide;
}

export interface TokenMix {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  total: number;
}

export interface FileOverlapSummary {
  shared: string[];
  leftOnly: string[];
  rightOnly: string[];
}

export interface SessionComparison {
  taskMatch: TaskMatchQuality;
  isSameTask: boolean;
  leftProject: string | null;
  rightProject: string | null;
  isSameProject: boolean;
  cost: MetricDelta;
  totalTokens: MetricDelta;
  cacheHitRate: MetricDelta;
  durationMs: MetricDelta;
  steps: MetricDelta;
  toolCalls: MetricDelta;
  errors: MetricDelta;
  tokens: {
    left: TokenMix;
    right: TokenMix;
  };
  files: FileOverlapSummary;
}

function buildDelta(
  left: number,
  right: number,
  preference: "lower" | "higher"
): MetricDelta {
  const delta = right - left;
  const deltaPct = left !== 0 ? (delta / Math.abs(left)) * 100 : null;
  let better: BetterSide = "tie";
  if (Math.abs(delta) > 1e-6) {
    if (preference === "lower") {
      better = right < left ? "right" : "left";
    } else {
      better = right > left ? "right" : "left";
    }
  }
  return { left, right, delta, deltaPct, better };
}

function extractTouchedFiles(session: NormalizedSession): Set<string> {
  const files = new Set<string>();
  for (const step of session.steps) {
    for (const tool of step.toolCalls) {
      if (!tool.targetPath) continue;
      const normalized = tool.targetPath.replace(/\\/g, "/").trim();
      if (normalized) files.add(normalized);
    }
  }
  return files;
}

function toTokenMix(analytics: SessionAnalytics): TokenMix {
  const total = Math.max(analytics.totalTokens, 1);
  return {
    input: analytics.totalInputTokens,
    output: analytics.totalOutputTokens,
    cacheRead: analytics.totalCacheReadTokens,
    cacheWrite: analytics.totalCacheWriteTokens,
    total,
  };
}

const PROJECT_ANCHORS = ["projects", "repos", "workspace", "workspaces", "github", "dev", "code"];

export function extractSessionProject(session: NormalizedSession): string | null {
  const counts = new Map<string, number>();

  for (const step of session.steps) {
    for (const tool of step.toolCalls) {
      if (!tool.targetPath) continue;
      const parts = tool.targetPath.replace(/\\/g, "/").split("/").filter(Boolean);
      if (parts.length < 3) continue;

      for (let i = 0; i < parts.length - 2; i++) {
        if (PROJECT_ANCHORS.includes(parts[i].toLowerCase())) {
          const candidate = parts[i + 1];
          if (candidate && candidate !== "." && candidate !== "..") {
            counts.set(candidate, (counts.get(candidate) ?? 0) + 1);
          }
          break;
        }
      }
    }
  }

  let best: string | null = null;
  let bestCount = 0;
  for (const [name, count] of counts) {
    if (count > bestCount) {
      best = name;
      bestCount = count;
    }
  }
  return best;
}

export interface ProjectSessionGroup {
  project: string;
  sessions: NormalizedSession[];
}

export function groupSessionsByProject(sessions: NormalizedSession[]): ProjectSessionGroup[] {
  const groups = new Map<string, NormalizedSession[]>();
  const other: NormalizedSession[] = [];

  for (const session of sessions) {
    const project = extractSessionProject(session);
    if (!project) {
      other.push(session);
      continue;
    }
    const list = groups.get(project) ?? [];
    list.push(session);
    groups.set(project, list);
  }

  const result: ProjectSessionGroup[] = Array.from(groups.entries()).map(([project, items]) => ({
    project,
    sessions: items,
  }));
  if (other.length > 0) {
    result.push({ project: "Other", sessions: other });
  }
  return result;
}

function tokenizeText(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9_./-]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);
  return new Set(words);
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  return intersection / (a.size + b.size - intersection);
}

export function assessTaskMatch(a: NormalizedSession, b: NormalizedSession): TaskMatchQuality {
  const titleA = a.title.trim().toLowerCase();
  const titleB = b.title.trim().toLowerCase();
  if (titleA && titleA === titleB) return "exact";

  const promptA = a.steps.find((s) => s.role === "user")?.summary.trim().toLowerCase() ?? "";
  const promptB = b.steps.find((s) => s.role === "user")?.summary.trim().toLowerCase() ?? "";
  if (promptA && promptA === promptB) return "exact";

  const textSim = jaccardSimilarity(
    tokenizeText(`${titleA} ${promptA}`),
    tokenizeText(`${titleB} ${promptB}`)
  );
  const filesA = extractTouchedFiles(a);
  const filesB = extractTouchedFiles(b);
  const fileSim = jaccardSimilarity(filesA, filesB);

  if (textSim >= 0.35 || fileSim >= 0.4) return "similar";
  return "different";
}

export function isSameTaskSession(a: NormalizedSession, b: NormalizedSession): boolean {
  return assessTaskMatch(a, b) !== "different";
}

export function compareSessions(
  left: NormalizedSession,
  right: NormalizedSession,
  leftAnalytics: SessionAnalytics,
  rightAnalytics: SessionAnalytics
): SessionComparison {
  const leftFiles = extractTouchedFiles(left);
  const rightFiles = extractTouchedFiles(right);

  const shared: string[] = [];
  const leftOnly: string[] = [];
  const rightOnly: string[] = [];

  for (const file of leftFiles) {
    if (rightFiles.has(file)) shared.push(file);
    else leftOnly.push(file);
  }
  for (const file of rightFiles) {
    if (!leftFiles.has(file)) rightOnly.push(file);
  }

  const taskMatch = assessTaskMatch(left, right);

  const leftProject = extractSessionProject(left);
  const rightProject = extractSessionProject(right);
  const isSameProject = Boolean(
    leftProject && rightProject && leftProject.toLowerCase() === rightProject.toLowerCase()
  );

  return {
    taskMatch,
    isSameTask: taskMatch !== "different",
    leftProject,
    rightProject,
    isSameProject,
    cost: buildDelta(leftAnalytics.estimatedCostUsd, rightAnalytics.estimatedCostUsd, "lower"),
    totalTokens: buildDelta(leftAnalytics.totalTokens, rightAnalytics.totalTokens, "lower"),
    cacheHitRate: buildDelta(leftAnalytics.cacheHitRate, rightAnalytics.cacheHitRate, "higher"),
    durationMs: buildDelta(leftAnalytics.totalDurationMs, rightAnalytics.totalDurationMs, "lower"),
    steps: buildDelta(left.steps.length, right.steps.length, "lower"),
    toolCalls: buildDelta(leftAnalytics.toolCallCount, rightAnalytics.toolCallCount, "lower"),
    errors: buildDelta(leftAnalytics.errorCount, rightAnalytics.errorCount, "lower"),
    tokens: {
      left: toTokenMix(leftAnalytics),
      right: toTokenMix(rightAnalytics),
    },
    files: {
      shared: shared.sort(),
      leftOnly: leftOnly.sort(),
      rightOnly: rightOnly.sort(),
    },
  };
}
