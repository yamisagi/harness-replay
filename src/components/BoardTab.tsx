"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { StepFilter } from "@/src/hooks/useReplayWorkspace";
import { SessionStep } from "@/src/types/session";
import { SWARM_STYLES } from "./SwarmStyles";

interface BoardTabProps {
  steps: SessionStep[];
  filter: StepFilter;
  onFilterChange: (filter: StepFilter) => void;
  selectedStepId: string | null;
  onSelectStep: (stepId: string) => void;
}

const FILTERS: Array<{ id: StepFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "user", label: "User" },
  { id: "assistant", label: "Agent" },
  { id: "errors", label: "Errors" },
];

const ROLE_LABELS: Record<SessionStep["role"], string> = {
  user: "USER",
  assistant: "AGENT",
  tool: "TOOL",
  system: "SYS",
};

export function BoardTab({
  steps,
  filter,
  onFilterChange,
  selectedStepId,
  onSelectStep,
}: BoardTabProps) {
  const [query, setQuery] = useState("");

  const visibleSteps = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return steps;
    return steps.filter((step) => {
      if (step.summary.toLowerCase().includes(q)) return true;
      if (step.content?.toLowerCase().includes(q)) return true;
      return step.toolCalls.some(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          Boolean(t.targetPath?.toLowerCase().includes(q))
      );
    });
  }, [steps, query]);

  const maxTokens = Math.max(
    1,
    ...visibleSteps.map(
      (s) =>
        s.usage.inputTokens +
        s.usage.outputTokens +
        s.usage.cacheReadTokens +
        s.usage.cacheWriteTokens
    )
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by step, tool, or file path..."
            className="w-full rounded-md border border-[#1e2026] bg-[#111318] pl-8 pr-3 py-1.5 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
          />
        </div>

        <div className={SWARM_STYLES.filterBar}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onFilterChange(f.id)}
              className={`${SWARM_STYLES.filterBtnBase} ${
                filter === f.id ? SWARM_STYLES.filterBtnActive : SWARM_STYLES.filterBtnIdle
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {visibleSteps.length === 0 ? (
        <div className="rounded-md border border-[#1e2026] bg-[#111318] p-8 text-center text-xs font-mono text-zinc-500">
          No steps match the current filter or search.
        </div>
      ) : (
        <div className="relative flex flex-col">
          {visibleSteps.length > 1 && (
            <div className="absolute left-[11px] top-3 bottom-3 w-px bg-[#22252e]" aria-hidden="true" />
          )}

          {visibleSteps.map((step) => {
            const isSelected = step.id === selectedStepId;
            const isUser = step.role === "user";
            const hasError = step.toolCalls.some((t) => t.status === "error");
            const hasPending = !hasError && step.toolCalls.some((t) => t.status === "pending");
            const u = step.usage;
            const totalStepTokens = u.inputTokens + u.outputTokens + u.cacheReadTokens + u.cacheWriteTokens;
            const barWidth = Math.max(4, Math.round((totalStepTokens / maxTokens) * 100));

            const nodeColor = hasError
              ? "border-rose-400 bg-rose-500"
              : hasPending
              ? "border-amber-400 bg-amber-400"
              : isUser
              ? "border-zinc-400 bg-[#090a0c]"
              : step.usage.cacheReadTokens > 0
              ? "border-emerald-400 bg-emerald-400"
              : "border-zinc-200 bg-zinc-200";

            return (
              <div key={step.id} className="relative pl-8 pb-3 last:pb-0 group">
                <span
                  className={`absolute left-[6px] top-3.5 w-[11px] h-[11px] rounded-full border-2 transition-transform group-hover:scale-110 ${nodeColor}`}
                />
                <button
                  type="button"
                  onClick={() => onSelectStep(step.id)}
                  className={`relative w-full text-left rounded-md border px-3.5 py-2.5 flex flex-col gap-1.5 transition-colors cursor-pointer ${
                    isSelected
                      ? "border-zinc-500 bg-[#151820]"
                      : "border-[#1e2026] bg-[#111318] hover:border-[#323640]"
                  }`}
                >
                  {isSelected && (
                    <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-emerald-400 rounded-r" />
                  )}
                  <div className="flex items-center justify-between gap-3 w-full min-w-0">
                    <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                      <span className="font-mono text-xs text-zinc-500 shrink-0">
                        #{String(step.index).padStart(2, "0")}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded font-mono text-[10px] uppercase tracking-wider shrink-0 ${
                          isUser
                            ? "bg-zinc-800 text-zinc-200"
                            : "bg-[#191c23] text-zinc-300 border border-[#252830]"
                        }`}
                      >
                        {ROLE_LABELS[step.role]}
                      </span>
                      <span className="text-xs text-zinc-200 truncate min-w-0">{step.summary}</span>
                    </div>

                    <div className="flex items-center gap-2.5 font-mono text-[11px] shrink-0">
                      {hasError && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-[10px] text-rose-400 uppercase shrink-0">
                          ERR
                        </span>
                      )}
                      {hasPending && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-[10px] text-amber-300 uppercase shrink-0">
                          NO RESULT
                        </span>
                      )}
                      {totalStepTokens > 0 && (
                        <>
                          <div className="hidden sm:block w-14 h-1.5 rounded-xs bg-[#1c1f26] overflow-hidden">
                            <div className={`h-full ${hasError ? "bg-rose-400" : "bg-zinc-300"}`} style={{ width: `${barWidth}%` }} />
                          </div>
                          <span className="text-zinc-300 text-right tabular-nums">
                            {totalStepTokens.toLocaleString("en-US")} tok
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {(step.toolCalls.length > 0 ||
                    step.durationMs !== undefined ||
                    step.usage.cacheReadTokens > 0) && (
                    <div className="flex items-center justify-between gap-2 w-full min-w-0 text-[10px] font-mono text-zinc-500">
                      <span className="truncate min-w-0">
                        {step.toolCalls.length > 0
                          ? `[${step.toolCalls.map((t) => t.name).slice(0, 2).join(", ")}${
                              step.toolCalls.length > 2 ? ` +${step.toolCalls.length - 2}` : ""
                            }]`
                          : ""}
                      </span>
                      <div className="flex items-center gap-3 shrink-0">
                        {step.durationMs !== undefined && (
                          <span>{(step.durationMs / 1000).toFixed(2)}s</span>
                        )}
                        {step.usage.cacheReadTokens > 0 && (
                          <span className="text-emerald-400">
                            +{step.usage.cacheReadTokens.toLocaleString("en-US")} cache
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
