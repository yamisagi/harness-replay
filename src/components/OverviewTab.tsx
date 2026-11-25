"use client";

import { ArrowRight, Target } from "lucide-react";
import { NormalizedSession, SessionAnalytics } from "@/src/types/session";
import { QuotaImpactCard } from "./QuotaImpactCard";
import { SwarmTab } from "./SwarmHeader";
import { SWARM_STYLES } from "./SwarmStyles";

interface OverviewTabProps {
  session: NormalizedSession;
  analytics: SessionAnalytics;
  onNavigateTab: (tab: SwarmTab) => void;
}

function pct(part: number, total: number): number {
  return total > 0 ? Math.max(0, (part / total) * 100) : 0;
}

function classifyTool(name: string): "read" | "edit" | "exec" | "other" {
  const n = name.toLowerCase();
  if (/read|grep|glob|find|search|list|view|inspect/.test(n)) return "read";
  if (/edit|write|patch|create|replace|multi/.test(n)) return "edit";
  if (/bash|run|command|exec|test|shell|terminal/.test(n)) return "exec";
  return "other";
}

export function OverviewTab({ session, analytics, onNavigateTab }: OverviewTabProps) {
  const firstUserStep = session.steps.find((s) => s.role === "user");
  const goalText = firstUserStep?.content ?? firstUserStep?.summary ?? session.title;

  const cacheReadPct = pct(analytics.totalCacheReadTokens, analytics.totalTokens);
  const freshInputPct = pct(analytics.totalInputTokens, analytics.totalTokens);
  const cacheWritePct = pct(analytics.totalCacheWriteTokens, analytics.totalTokens);
  const outputPct = pct(analytics.totalOutputTokens, analytics.totalTokens);

  const phases = { read: 0, edit: 0, exec: 0, other: 0 };
  for (const step of session.steps) {
    for (const tool of step.toolCalls) {
      phases[classifyTool(tool.name)] += 1;
    }
  }

  const phaseCards = [
    { key: "read", label: "Explore / Read", count: phases.read, tone: "text-sky-400" },
    { key: "edit", label: "Edit / Write", count: phases.edit, tone: "text-emerald-400" },
    { key: "exec", label: "Execute / Verify", count: phases.exec, tone: "text-amber-400" },
    { key: "other", label: "Other Tools", count: phases.other, tone: "text-zinc-300" },
  ];

  const topInsights = analytics.insights.slice(0, 3);

  return (
    <div className="flex flex-col gap-5">
      <div className={SWARM_STYLES.card}>
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-zinc-500">
            <Target className="w-3.5 h-3.5 text-zinc-400" />
            Session Goal
          </span>
          <span className="text-[11px] font-mono text-zinc-500">
            {session.steps.length} steps · {analytics.toolCallCount} tool calls
          </span>
        </div>
        <p className="text-sm text-zinc-200 leading-relaxed line-clamp-3">{goalText}</p>
      </div>

      <div className={SWARM_STYLES.kpiGrid}>
        <div className={SWARM_STYLES.kpiCell}>
          <span className={SWARM_STYLES.kpiLabel}>Total Tokens</span>
          <span className={SWARM_STYLES.kpiValue}>
            {analytics.totalTokens.toLocaleString("en-US")}
          </span>
          <span className={SWARM_STYLES.kpiSub}>
            {analytics.totalInputTokens.toLocaleString("en-US")} in ·{" "}
            {analytics.totalOutputTokens.toLocaleString("en-US")} out
          </span>
        </div>
        <div className={SWARM_STYLES.kpiCell}>
          <span className={SWARM_STYLES.kpiLabel}>Cache Hit Rate</span>
          <span className={SWARM_STYLES.kpiValue}>{analytics.cacheHitRate.toFixed(1)}%</span>
          <span className={SWARM_STYLES.kpiSub}>
            {analytics.totalCacheReadTokens.toLocaleString("en-US")} cached
          </span>
        </div>
        <div className={SWARM_STYLES.kpiCell}>
          <span className={SWARM_STYLES.kpiLabel}>Cache Savings</span>
          <span className={`${SWARM_STYLES.kpiValue} text-emerald-400`}>
            ${analytics.estimatedSavingsUsd.toFixed(3)}
          </span>
          <span className={SWARM_STYLES.kpiSub}>Saved vs uncached</span>
        </div>
        <div className={SWARM_STYLES.kpiCell}>
          <span className={SWARM_STYLES.kpiLabel}>Estimated Cost</span>
          <span className={SWARM_STYLES.kpiValue}>${analytics.estimatedCostUsd.toFixed(3)}</span>
          <span className={`${SWARM_STYLES.kpiSub} ${analytics.errorCount > 0 ? "text-rose-400" : ""}`}>
            {analytics.errorCount > 0 ? `${analytics.errorCount} failed tool(s)` : "0 errors"}
          </span>
        </div>
      </div>

      {analytics.totalTokens > 0 && (
        <div className={SWARM_STYLES.card}>
          <div className="h-2 w-full rounded-sm bg-[#1a1d23] overflow-hidden flex" aria-label="Token breakdown">
            <div className="bg-emerald-500/80 h-full" style={{ width: `${cacheReadPct}%` }} />
            <div className="bg-zinc-400 h-full" style={{ width: `${freshInputPct}%` }} />
            <div className="bg-amber-500/80 h-full" style={{ width: `${cacheWritePct}%` }} />
            <div className="bg-sky-400/80 h-full" style={{ width: `${outputPct}%` }} />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-xs bg-emerald-500/80" />
              Cache Read {cacheReadPct.toFixed(0)}%
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-xs bg-zinc-400" />
              Fresh Input {freshInputPct.toFixed(0)}%
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-xs bg-amber-500/80" />
              Cache Write {cacheWritePct.toFixed(0)}%
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-xs bg-sky-400/80" />
              Output {outputPct.toFixed(0)}%
            </span>
          </div>
        </div>
      )}

      <QuotaImpactCard session={session} analytics={analytics} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {phaseCards.map((phase) => (
          <div key={phase.key} className={SWARM_STYLES.card}>
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
              {phase.label}
            </span>
            <span className={`text-lg font-mono font-semibold ${phase.tone}`}>{phase.count}</span>
            <span className="text-[11px] font-mono text-zinc-500">tool invocations</span>
          </div>
        ))}
      </div>

      {topInsights.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
              Top Signals ({analytics.insights.length})
            </span>
            <button
              type="button"
              onClick={() => onNavigateTab("diagnostics")}
              className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-zinc-100 cursor-pointer"
            >
              <span>View all diagnostics</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {topInsights.map((insight) => {
            const accent =
              insight.severity === "success"
                ? "border-l-emerald-500"
                : insight.severity === "warning"
                ? "border-l-amber-500"
                : "border-l-sky-500";
            return (
              <div
                key={insight.id}
                className={`rounded-md border border-[#1e2026] bg-[#111318] border-l-2 ${accent} px-3.5 py-2.5 flex flex-col gap-1`}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-zinc-100 truncate">{insight.title}</span>
                  {insight.savingsEstimate && (
                    <span className="font-mono text-zinc-400 shrink-0">{insight.savingsEstimate}</span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 line-clamp-2">{insight.description}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
