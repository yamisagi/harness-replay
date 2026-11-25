"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { StepFilter } from "@/src/hooks/useReplayWorkspace";
import { SessionStep } from "@/src/types/session";
import { REPLAY_STYLES } from "./ReplayStyles";

interface StepTimelineProps {
  steps: SessionStep[];
  filter: StepFilter;
  onFilterChange: (filter: StepFilter) => void;
  expandedToolIds: Record<string, boolean>;
  onToggleTool: (toolId: string) => void;
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

export function StepTimeline({
  steps,
  filter,
  onFilterChange,
  expandedToolIds,
  onToggleTool,
}: StepTimelineProps) {
  const [openStepIds, setOpenStepIds] = useState<Record<string, boolean>>({});
  const allOpen = steps.length > 0 && steps.every((s) => openStepIds[s.id]);

  const toggleStep = (stepId: string) =>
    setOpenStepIds((prev) => ({ ...prev, [stepId]: !prev[stepId] }));

  const toggleAll = () => {
    if (allOpen) {
      setOpenStepIds({});
    } else {
      const next: Record<string, boolean> = {};
      for (const s of steps) next[s.id] = true;
      setOpenStepIds(next);
    }
  };

  const maxStepTokens = Math.max(
    1,
    ...steps.map(
      (s) =>
        s.usage.inputTokens +
        s.usage.outputTokens +
        s.usage.cacheReadTokens +
        s.usage.cacheWriteTokens
    )
  );

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
            Execution Trace
          </h2>
          <span className="text-[11px] font-mono text-zinc-400">({steps.length} steps)</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {steps.length > 0 && (
            <button
              type="button"
              onClick={toggleAll}
              className="px-2.5 py-1 rounded border border-[#222429] bg-[#111317] hover:border-zinc-600 text-xs font-mono text-zinc-300 cursor-pointer"
            >
              {allOpen ? "Collapse all" : "Expand all"}
            </button>
          )}
          <div className={REPLAY_STYLES.filterBar}>
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onFilterChange(f.id)}
                className={`${REPLAY_STYLES.filterBtnBase} ${
                  filter === f.id ? REPLAY_STYLES.filterBtnActive : REPLAY_STYLES.filterBtnIdle
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {steps.length === 0 ? (
        <div className="rounded-md border border-[#222429] bg-[#111317] p-8 text-center text-xs font-mono text-zinc-500">
          No steps match the selected filter.
        </div>
      ) : (
        <div className={REPLAY_STYLES.timelineWrap}>
          {steps.length > 1 && <div className={REPLAY_STYLES.timelineRail} aria-hidden="true" />}

          {steps.map((step) => {
            const isUser = step.role === "user";
            const isOpen = Boolean(openStepIds[step.id]);
            const hasError = step.toolCalls.some((t) => t.status === "error");
            const totalStepTokens =
              step.usage.inputTokens +
              step.usage.outputTokens +
              step.usage.cacheReadTokens +
              step.usage.cacheWriteTokens;
            const barWidth = Math.max(4, Math.round((totalStepTokens / maxStepTokens) * 100));

            const nodeColor = hasError
              ? "border-rose-400 bg-rose-500"
              : isUser
              ? "border-zinc-400 bg-[#0b0c0e]"
              : step.usage.cacheReadTokens > 0
              ? "border-emerald-400 bg-emerald-400"
              : "border-zinc-200 bg-zinc-200";

            return (
              <div key={step.id} className={REPLAY_STYLES.timelineRow}>
                <span className={`${REPLAY_STYLES.timelineNodeBase} ${nodeColor}`} />

                <div className="rounded-md border border-[#222429] bg-[#111317] group-hover:border-[#323640] transition-colors overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleStep(step.id)}
                    aria-expanded={isOpen}
                    className="w-full px-3.5 py-2.5 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-[#15181e]/60 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isOpen ? (
                        <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      )}
                      <span className="font-mono text-xs text-zinc-500 shrink-0">
                        #{String(step.index).padStart(2, "0")}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded font-mono text-[10px] uppercase tracking-wider shrink-0 ${
                          isUser
                            ? "bg-zinc-800 text-zinc-200"
                            : "bg-[#1a1d24] text-zinc-300 border border-[#272a32]"
                        }`}
                      >
                        {ROLE_LABELS[step.role]}
                      </span>
                      <span className="text-xs text-zinc-200 truncate">{step.summary}</span>
                      {step.toolCalls.length > 0 && (
                        <span className="hidden md:inline text-[10px] font-mono text-zinc-500 shrink-0">
                          [{step.toolCalls.length} tool{step.toolCalls.length > 1 ? "s" : ""}]
                        </span>
                      )}
                      {hasError && (
                        <span className="text-[10px] font-mono text-rose-400 uppercase shrink-0">
                          ERR
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 font-mono text-[11px] shrink-0">
                      {step.durationMs !== undefined && (
                        <span className="hidden sm:inline text-zinc-500">
                          {(step.durationMs / 1000).toFixed(2)}s
                        </span>
                      )}
                      {step.usage.cacheReadTokens > 0 && (
                        <span className="hidden md:inline text-emerald-400">
                          +{step.usage.cacheReadTokens.toLocaleString("en-US")} cache
                        </span>
                      )}
                      <div className="hidden sm:block w-14 h-1.5 rounded-xs bg-[#1c1f26] overflow-hidden">
                        <div
                          className={`h-full ${hasError ? "bg-rose-400" : "bg-zinc-300"}`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className="text-zinc-300 w-16 text-right">
                        {totalStepTokens.toLocaleString("en-US")} tok
                      </span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-3.5 pb-3.5 pt-2 border-t border-[#222429] flex flex-col gap-2.5 bg-[#0e1014]">
                      <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap break-words">
                        {step.content ?? step.summary}
                      </p>

                      {step.toolCalls.length > 0 && (
                        <div className="flex flex-col gap-1.5 pt-1">
                          {step.toolCalls.map((tool) => {
                            const isExpanded = Boolean(expandedToolIds[tool.id]);
                            return (
                              <div key={tool.id} className={REPLAY_STYLES.toolBox}>
                                <button
                                  type="button"
                                  onClick={() => onToggleTool(tool.id)}
                                  className="w-full flex items-center justify-between gap-2 text-left cursor-pointer"
                                >
                                  <div className="flex items-center gap-2 min-w-0 font-mono">
                                    {isExpanded ? (
                                      <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                    )}
                                    <span className="text-zinc-200 font-medium">{tool.name}</span>
                                    {tool.targetPath && (
                                      <span className="text-zinc-500 truncate">
                                        {tool.targetPath}
                                      </span>
                                    )}
                                  </div>
                                  <span
                                    className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono ${
                                      tool.status === "error"
                                        ? "bg-rose-500/15 text-rose-400"
                                        : "text-zinc-500"
                                    }`}
                                  >
                                    {tool.status === "error" ? "ERR" : "OK"}
                                  </span>
                                </button>

                                {isExpanded && (
                                  <div className="mt-2 pt-2 border-t border-[#222429] flex flex-col gap-2 font-mono text-[11px] text-zinc-300">
                                    <pre className="overflow-x-auto whitespace-pre-wrap text-zinc-400">
                                      {tool.argumentsPreview}
                                    </pre>
                                    {tool.outputPreview && (
                                      <div className="rounded bg-[#111317] border border-[#222429] p-2 text-zinc-300">
                                        {tool.outputPreview}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
