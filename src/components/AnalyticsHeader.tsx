"use client";

import { NormalizedSession, SessionAnalytics } from "@/src/types/session";
import { REPLAY_STYLES } from "./ReplayStyles";

interface AnalyticsHeaderProps {
  session: NormalizedSession;
  analytics: SessionAnalytics;
}

function pct(part: number, total: number): number {
  return total > 0 ? Math.max(0, (part / total) * 100) : 0;
}

export function AnalyticsHeader({ session, analytics }: AnalyticsHeaderProps) {
  const cacheReadPct = pct(analytics.totalCacheReadTokens, analytics.totalTokens);
  const freshInputPct = pct(analytics.totalInputTokens, analytics.totalTokens);
  const cacheWritePct = pct(analytics.totalCacheWriteTokens, analytics.totalTokens);
  const outputPct = pct(analytics.totalOutputTokens, analytics.totalTokens);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-3 border-b border-[#222429]">
        <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">{session.title}</h1>
        <p className="text-xs text-zinc-400 font-mono">
          {session.model} · {analytics.toolCallCount} tools ·{" "}
          {(analytics.totalDurationMs / 1000).toFixed(1)}s
        </p>
      </div>

      <div className={REPLAY_STYLES.telemetryGrid}>
        <div className={REPLAY_STYLES.telemetryCell}>
          <span className={REPLAY_STYLES.telemetryLabel}>Total Tokens</span>
          <span className={REPLAY_STYLES.telemetryValue}>
            {analytics.totalTokens.toLocaleString("en-US")}
          </span>
          <span className={REPLAY_STYLES.telemetrySub}>
            {analytics.totalInputTokens.toLocaleString("en-US")} in ·{" "}
            {analytics.totalOutputTokens.toLocaleString("en-US")} out
          </span>
        </div>

        <div className={REPLAY_STYLES.telemetryCell}>
          <span className={REPLAY_STYLES.telemetryLabel}>Cache Hit Rate</span>
          <span className={REPLAY_STYLES.telemetryValue}>
            {analytics.cacheHitRate.toFixed(1)}%
          </span>
          <span className={REPLAY_STYLES.telemetrySub}>
            {analytics.totalCacheReadTokens.toLocaleString("en-US")} cached
          </span>
        </div>

        <div className={REPLAY_STYLES.telemetryCell}>
          <span className={REPLAY_STYLES.telemetryLabel}>Cache Savings</span>
          <span className={`${REPLAY_STYLES.telemetryValue} text-emerald-400`}>
            ${analytics.estimatedSavingsUsd.toFixed(3)}
          </span>
          <span className={REPLAY_STYLES.telemetrySub}>Saved vs uncached</span>
        </div>

        <div className={REPLAY_STYLES.telemetryCell}>
          <span className={REPLAY_STYLES.telemetryLabel}>Estimated Cost</span>
          <span className={REPLAY_STYLES.telemetryValue}>
            ${analytics.estimatedCostUsd.toFixed(3)}
          </span>
          <span
            className={`${REPLAY_STYLES.telemetrySub} ${
              analytics.errorCount > 0 ? "text-rose-400" : ""
            }`}
          >
            {analytics.errorCount > 0 ? `${analytics.errorCount} failed tool(s)` : "0 errors"}
          </span>
        </div>
      </div>

      {analytics.totalTokens > 0 && (
        <div className={REPLAY_STYLES.breakdownWrap}>
          <div className={REPLAY_STYLES.breakdownTrack} aria-label="Token breakdown">
            <div
              className="bg-emerald-500/80 h-full"
              style={{ width: `${cacheReadPct}%` }}
              title={`Cache Read: ${cacheReadPct.toFixed(1)}%`}
            />
            <div
              className="bg-zinc-400 h-full"
              style={{ width: `${freshInputPct}%` }}
              title={`Fresh Input: ${freshInputPct.toFixed(1)}%`}
            />
            <div
              className="bg-amber-500/80 h-full"
              style={{ width: `${cacheWritePct}%` }}
              title={`Cache Write: ${cacheWritePct.toFixed(1)}%`}
            />
            <div
              className="bg-sky-400/80 h-full"
              style={{ width: `${outputPct}%` }}
              title={`Output: ${outputPct.toFixed(1)}%`}
            />
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

      {analytics.insights.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
            Diagnostics ({analytics.insights.length})
          </span>
          {analytics.insights.map((insight) => {
            const borderAccent =
              insight.severity === "success"
                ? "border-l-emerald-500"
                : insight.severity === "warning"
                ? "border-l-amber-500"
                : "border-l-sky-500";
            const badgeStyle =
              insight.severity === "success"
                ? "text-emerald-400"
                : insight.severity === "warning"
                ? "text-amber-400"
                : "text-sky-400";
            const tagLabel =
              insight.severity === "success"
                ? "PASS"
                : insight.severity === "warning"
                ? "WARN"
                : "INFO";

            return (
              <div
                key={insight.id}
                className={`${REPLAY_STYLES.diagnosticRow} ${borderAccent}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-[10px] font-mono font-semibold ${badgeStyle}`}>
                      [{tagLabel}]
                    </span>
                    <span className="font-medium text-zinc-100 truncate">{insight.title}</span>
                  </div>
                  {insight.savingsEstimate && (
                    <span className="text-xs font-mono text-zinc-400 shrink-0">
                      {insight.savingsEstimate}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400">{insight.description}</p>
                {insight.affectedItems && insight.affectedItems.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {insight.affectedItems.map((item) => (
                      <span key={item} className={REPLAY_STYLES.insightTag}>
                        {item}
                      </span>
                    ))}
                  </div>
                )}
                {insight.action && (
                  <div className={REPLAY_STYLES.insightActionBox}>{insight.action}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
