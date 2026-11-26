"use client";

import { ArrowLeftRight, FileCode2 } from "lucide-react";
import { MetricDelta, SessionComparison } from "@/src/lib/analytics/sessionCompare";
import { formatUsd } from "@/src/lib/pricing";
import { NormalizedSession, SessionAnalytics } from "@/src/types/session";
import { CompareTimeline } from "./CompareTimeline";
import { SWARM_STYLES } from "./SwarmStyles";

interface CompareTabProps {
  left: NormalizedSession;
  leftAnalytics: SessionAnalytics;
  right: NormalizedSession | null;
  rightAnalytics: SessionAnalytics | null;
  sameTaskCandidates: NormalizedSession[];
  sameProjectCandidates: NormalizedSession[];
  otherCandidates: NormalizedSession[];
  comparison: SessionComparison | null;
  selectedStepId: string | null;
  selectedStepSessionId: string | null;
  onSelectRightId: (id: string) => void;
  onSwap: () => void;
  onSelectStep: (stepId: string, sessionId: string) => void;
}

function formatDeltaBadge(metric: MetricDelta, suffix = ""): string {
  if (metric.better === "tie") return "0%";
  const sign = metric.delta > 0 ? "+" : "";
  if (metric.deltaPct !== null) {
    return `${sign}${metric.deltaPct.toFixed(1)}%`;
  }
  return `${sign}${metric.delta}${suffix}`;
}

function DeltaCard({
  label,
  leftVal,
  rightVal,
  metric,
  suffix = "",
}: {
  label: string;
  leftVal: string;
  rightVal: string;
  metric: MetricDelta;
  suffix?: string;
}) {
  const badgeClass =
    metric.better === "right"
      ? SWARM_STYLES.deltaGood
      : metric.better === "left"
      ? SWARM_STYLES.deltaBad
      : SWARM_STYLES.deltaNeutral;

  return (
    <div className={SWARM_STYLES.kpiCell}>
      <div className="flex items-center justify-between gap-2">
        <span className={SWARM_STYLES.kpiLabel}>{label}</span>
        <span className={`rounded border px-1.5 py-0.5 text-[10px] font-mono ${badgeClass}`}>
          B vs A: {formatDeltaBadge(metric, suffix)}
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-2 pt-1 font-mono">
        <span className="text-sm font-semibold text-zinc-100">A: {leftVal}</span>
        <span className="text-sm font-semibold text-zinc-300">B: {rightVal}</span>
      </div>
    </div>
  );
}

function TokenMixBar({
  label,
  mix,
}: {
  label: string;
  mix: SessionComparison["tokens"]["left"];
}) {
  const pct = (val: number) => `${((val / mix.total) * 100).toFixed(1)}%`;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
        <span>{label}</span>
        <span>{mix.total.toLocaleString()} tokens</span>
      </div>
      <div className="h-2.5 w-full rounded bg-[#090a0c] border border-[#1e2026] overflow-hidden flex">
        <div style={{ width: pct(mix.cacheRead) }} className="bg-emerald-500/80" title="Cache Read" />
        <div style={{ width: pct(mix.cacheWrite) }} className="bg-amber-500/80" title="Cache Write" />
        <div style={{ width: pct(mix.input) }} className="bg-sky-500/80" title="Input" />
        <div style={{ width: pct(mix.output) }} className="bg-violet-500/80" title="Output" />
      </div>
    </div>
  );
}

export function CompareTab({
  left,
  leftAnalytics,
  right,
  rightAnalytics,
  sameTaskCandidates,
  sameProjectCandidates,
  otherCandidates,
  comparison,
  selectedStepId,
  selectedStepSessionId,
  onSelectRightId,
  onSwap,
  onSelectStep,
}: CompareTabProps) {
  if (!right || !rightAnalytics || !comparison) {
    return (
      <div className={SWARM_STYLES.card}>
        <p className="text-sm font-mono text-zinc-200">Not enough sessions to compare</p>
        <p className="text-xs text-zinc-500">
          Load or scan at least two .jsonl sessions from the sidebar to run a side-by-side comparison.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className={`${SWARM_STYLES.card} md:flex-row md:items-center md:justify-between gap-3`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className={SWARM_STYLES.badge}>A · {left.harness}</span>
          <span className="text-xs font-mono text-zinc-100 truncate">{left.title}</span>
          {comparison.isSameProject && comparison.leftProject && (
            <span className="inline-flex items-center shrink-0 rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-mono text-emerald-300">
              {comparison.leftProject}
            </span>
          )}
          {comparison.taskMatch === "similar" && (
            <span className="inline-flex items-center shrink-0 rounded border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-mono text-sky-300">
              Similar task
            </span>
          )}
          {comparison.taskMatch === "different" && (
            <span className="inline-flex items-center shrink-0 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-mono text-amber-300">
              Different tasks
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onSwap}
            title="Swap Session A and B"
            className="inline-flex items-center gap-1 rounded border border-[#252830] bg-[#090a0c] hover:border-zinc-400 px-2 py-1 text-[11px] font-mono text-zinc-300 cursor-pointer shrink-0"
          >
            <ArrowLeftRight className="w-3 h-3" />
            Swap
          </button>
          <span className={SWARM_STYLES.badge}>B</span>
          <select
            aria-label="Compare against session"
            value={right.id}
            onChange={(e) => onSelectRightId(e.target.value)}
            className={SWARM_STYLES.compareSelect}
          >
            {sameTaskCandidates.length > 0 && (
              <optgroup label="Same task">
                {sameTaskCandidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.harness}] {c.title} ({c.steps.length} steps)
                  </option>
                ))}
              </optgroup>
            )}
            {sameProjectCandidates.length > 0 && (
              <optgroup label={`Same project${comparison.leftProject ? ` (${comparison.leftProject})` : ""}`}>
                {sameProjectCandidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.harness}] {c.title} ({c.steps.length} steps)
                  </option>
                ))}
              </optgroup>
            )}
            {otherCandidates.length > 0 && (
              <optgroup label="Other sessions">
                {otherCandidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.harness}] {c.title} ({c.steps.length} steps)
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      </div>

      <div className={SWARM_STYLES.kpiGrid}>
        <DeltaCard
          label="Estimated Cost"
          leftVal={formatUsd(leftAnalytics.estimatedCostUsd)}
          rightVal={formatUsd(rightAnalytics.estimatedCostUsd)}
          metric={comparison.cost}
        />
        <DeltaCard
          label="Cache Hit Rate"
          leftVal={`${leftAnalytics.cacheHitRate.toFixed(1)}%`}
          rightVal={`${rightAnalytics.cacheHitRate.toFixed(1)}%`}
          metric={comparison.cacheHitRate}
          suffix="%"
        />
        <DeltaCard
          label="Total Tokens"
          leftVal={leftAnalytics.totalTokens.toLocaleString()}
          rightVal={rightAnalytics.totalTokens.toLocaleString()}
          metric={comparison.totalTokens}
        />
        <DeltaCard
          label="Duration / Errors"
          leftVal={`${(leftAnalytics.totalDurationMs / 1000).toFixed(1)}s · ${leftAnalytics.errorCount}e`}
          rightVal={`${(rightAnalytics.totalDurationMs / 1000).toFixed(1)}s · ${rightAnalytics.errorCount}e`}
          metric={comparison.durationMs}
        />
      </div>

      <div className={SWARM_STYLES.compareGrid}>
        <div className={SWARM_STYLES.card}>
          <div className="flex items-center justify-between text-xs font-mono text-zinc-300">
            <span>Token Distribution</span>
            <span className="text-[10px] text-zinc-500">Cache Read · Write · In · Out</span>
          </div>
          <TokenMixBar label={`A (${left.harness})`} mix={comparison.tokens.left} />
          <TokenMixBar label={`B (${right.harness})`} mix={comparison.tokens.right} />
        </div>

        <div className={SWARM_STYLES.card}>
          <div className="flex items-center justify-between text-xs font-mono text-zinc-300">
            <span className="inline-flex items-center gap-1.5">
              <FileCode2 className="w-3.5 h-3.5 text-zinc-400" />
              File Overlap & Duplicate Reads
            </span>
            <span className="text-[11px] text-zinc-500">
              Dup reads: A={leftAnalytics.duplicateFileReads.length} · B={rightAnalytics.duplicateFileReads.length}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[11px] font-mono pt-1">
            <div className="rounded border border-[#1e2026] bg-[#0b0c0e] p-2">
              <div className="text-zinc-500">Shared ({comparison.files.shared.length})</div>
              <div className="text-zinc-200 truncate mt-0.5">
                {comparison.files.shared.join(", ") || "—"}
              </div>
            </div>
            <div className="rounded border border-[#1e2026] bg-[#0b0c0e] p-2">
              <div className="text-zinc-500">Only A ({comparison.files.leftOnly.length})</div>
              <div className="text-zinc-300 truncate mt-0.5">
                {comparison.files.leftOnly.join(", ") || "—"}
              </div>
            </div>
            <div className="rounded border border-[#1e2026] bg-[#0b0c0e] p-2">
              <div className="text-zinc-500">Only B ({comparison.files.rightOnly.length})</div>
              <div className="text-zinc-300 truncate mt-0.5">
                {comparison.files.rightOnly.join(", ") || "—"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <CompareTimeline
        left={left}
        right={right}
        selectedStepId={selectedStepId}
        selectedStepSessionId={selectedStepSessionId}
        onSelectStep={onSelectStep}
      />
    </div>
  );
}
