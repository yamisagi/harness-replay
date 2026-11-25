import { calculateUsageCost, getModelPricing } from "@/src/lib/pricing";
import { HarnessType, NormalizedSession, SessionAnalytics } from "@/src/types/session";

export interface QuotaPlan {
  id: string;
  harness: HarnessType;
  label: string;
  budget5hUsd: number | null;
  budget7dUsd: number;
}

export interface QuotaImpact {
  used5hPct: number | null;
  used7dPct: number;
  cacheSaved5hPct: number | null;
  cacheSaved7dPct: number;
  whatIf: {
    saved5hPct: number | null;
    saved7dPct: number;
    reason: string;
  } | null;
}

const PLAN_STORAGE_KEY = "harness-replay:quota-plans:v1";

const QUOTA_PLANS: QuotaPlan[] = [
  { id: "agy-pro", harness: "antigravity", label: "Antigravity AI Pro", budget5hUsd: 4, budget7dUsd: 28 },
  { id: "agy-ultra", harness: "antigravity", label: "Antigravity AI Ultra", budget5hUsd: 20, budget7dUsd: 140 },
  { id: "claude-pro", harness: "claude-code", label: "Claude Pro", budget5hUsd: 5, budget7dUsd: 45 },
  { id: "claude-max-5x", harness: "claude-code", label: "Claude Max 5x", budget5hUsd: 25, budget7dUsd: 225 },
  { id: "claude-ultra", harness: "claude-code", label: "Claude Ultra", budget5hUsd: null, budget7dUsd: 450 },
  { id: "codex-plus", harness: "codex", label: "ChatGPT Plus", budget5hUsd: 4, budget7dUsd: 35 },
  { id: "codex-pro", harness: "codex", label: "ChatGPT Pro", budget5hUsd: null, budget7dUsd: 300 },
  { id: "api-standard", harness: "opencode", label: "API Budget ($5 / $35)", budget5hUsd: 5, budget7dUsd: 35 },
  { id: "api-heavy", harness: "opencode", label: "Heavy API ($25 / $175)", budget5hUsd: 25, budget7dUsd: 175 },
  { id: "generic-standard", harness: "generic", label: "API Budget ($5 / $35)", budget5hUsd: 5, budget7dUsd: 35 },
  { id: "generic-heavy", harness: "generic", label: "Heavy API ($25 / $175)", budget5hUsd: 25, budget7dUsd: 175 },
];

export function getPlansForHarness(harness: HarnessType): QuotaPlan[] {
  const matched = QUOTA_PLANS.filter((p) => p.harness === harness);
  return matched.length > 0 ? matched : QUOTA_PLANS.filter((p) => p.harness === "generic");
}

export function loadSavedPlanId(harness: HarnessType): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PLAN_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const val = (parsed as Record<string, unknown>)[harness];
    return typeof val === "string" ? val : null;
  } catch {
    return null;
  }
}

export function savePlanId(harness: HarnessType, planId: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(PLAN_STORAGE_KEY);
    const current = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    const next = current && typeof current === "object" ? { ...current, [harness]: planId } : { [harness]: planId };
    window.localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota or private mode errors
  }
}

export function estimateSessionQuota(
  session: NormalizedSession,
  analytics: SessionAnalytics,
  plan: QuotaPlan
): QuotaImpact {
  const used5hPct = plan.budget5hUsd ? (analytics.estimatedCostUsd / plan.budget5hUsd) * 100 : null;
  const used7dPct = (analytics.estimatedCostUsd / plan.budget7dUsd) * 100;
  const cacheSaved5hPct = plan.budget5hUsd ? (analytics.estimatedSavingsUsd / plan.budget5hUsd) * 100 : null;
  const cacheSaved7dPct = (analytics.estimatedSavingsUsd / plan.budget7dUsd) * 100;

  let avoidableUsd = 0;
  let reason = "";

  if (analytics.cacheHitRate < 70 && analytics.totalInputTokens > 3000) {
    const pricing = getModelPricing(session.model);
    const deltaPerM = Math.max(0, pricing.inputPerMillion - pricing.cacheReadPerMillion);
    avoidableUsd = ((analytics.totalInputTokens * 0.6) / 1_000_000) * deltaPerM;
    reason = "with higher prompt cache reuse (~70%)";
  } else if (analytics.errorCount > 0 || analytics.duplicateFileReads.length > 0) {
    const dupSet = new Set(analytics.duplicateFileReads.map((d) => d.path));
    for (const step of session.steps) {
      const hasIssue =
        step.toolCalls.some((t) => t.status === "error" || (t.targetPath && dupSet.has(t.targetPath)));
      if (hasIssue) {
        avoidableUsd += calculateUsageCost(step.usage, step.model ?? session.model).costUsd * 0.5;
      }
    }
    reason = "without failed retries & duplicate reads";
  }

  const saved5hPct = plan.budget5hUsd ? (avoidableUsd / plan.budget5hUsd) * 100 : null;
  const saved7dPct = (avoidableUsd / plan.budget7dUsd) * 100;
  const showWhatIf =
    avoidableUsd > 0 && (saved7dPct >= 0.05 || (saved5hPct !== null && saved5hPct >= 0.1));

  return {
    used5hPct,
    used7dPct,
    cacheSaved5hPct,
    cacheSaved7dPct,
    whatIf: showWhatIf ? { saved5hPct, saved7dPct, reason } : null,
  };
}
