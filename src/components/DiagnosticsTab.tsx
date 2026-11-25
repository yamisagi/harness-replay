"use client";

import { FileCode2, Wrench } from "lucide-react";
import { GraphContextNode } from "@/src/lib/analytics/sessionGraph";
import { SessionAnalytics } from "@/src/types/session";
import { SWARM_STYLES } from "./SwarmStyles";

interface DiagnosticsTabProps {
  analytics: SessionAnalytics;
  contextNodes: GraphContextNode[];
  onJumpToStep: (stepId: string) => void;
}

export function DiagnosticsTab({
  analytics,
  contextNodes,
  onJumpToStep,
}: DiagnosticsTabProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2.5">
        <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
          Linter Diagnostics ({analytics.insights.length})
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
              className={`rounded-md border border-[#1e2026] bg-[#111318] border-l-2 ${borderAccent} px-3.5 py-2.5 flex flex-col gap-1.5 text-sm`}
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
                    <span key={item} className={SWARM_STYLES.badge}>
                      {item}
                    </span>
                  ))}
                </div>
              )}
              {insight.action && (
                <div className="mt-1 rounded border border-[#1e2026] bg-[#090a0c] px-2.5 py-1.5 text-xs text-zinc-200 font-mono">
                  {insight.action}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2.5">
        <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
          Context Roster ({contextNodes.length})
        </span>

        {contextNodes.length === 0 ? (
          <div className="rounded-md border border-[#1e2026] bg-[#111318] p-4 text-xs font-mono text-zinc-500">
            No files or tools invoked in this session.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {contextNodes.map((node) => (
              <button
                key={node.id}
                type="button"
                onClick={() => node.stepIds[0] && onJumpToStep(node.stepIds[0])}
                title={node.fullPath}
                className="text-left rounded-md border border-[#1e2026] bg-[#111318] hover:border-zinc-500 px-3 py-2 flex items-center justify-between gap-2 cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {node.kind === "file" ? (
                    <FileCode2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  ) : (
                    <Wrench className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  )}
                  <span className="text-xs font-mono text-zinc-200 truncate">{node.label}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
                  {node.isDuplicateRead && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300">
                      DUP
                    </span>
                  )}
                  {node.hasError && (
                    <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300">
                      ERR
                    </span>
                  )}
                  <span className="text-zinc-500">{node.touchCount}x</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
