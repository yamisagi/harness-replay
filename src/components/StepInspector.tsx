"use client";

import { ChevronDown, ChevronRight, X } from "lucide-react";
import { SessionStep } from "@/src/types/session";
import { SWARM_STYLES } from "./SwarmStyles";

interface StepInspectorProps {
  step: SessionStep | null;
  expandedToolIds: Record<string, boolean>;
  onToggleTool: (toolId: string) => void;
  onClose: () => void;
}

export function StepInspector({
  step,
  expandedToolIds,
  onToggleTool,
  onClose,
}: StepInspectorProps) {
  return (
    <aside className={SWARM_STYLES.inspectorPane} aria-label="Step inspector">
      <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-b border-[#1e2026]">
        <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
          {step ? `Step #${String(step.index).padStart(2, "0")} Inspector` : "Step Inspector"}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close inspector"
          className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-[#151820] cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {!step ? (
        <div className="p-6 text-center text-xs font-mono text-zinc-500">
          Select a step from Board or Graph to inspect tokens, content, and tool calls.
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <span className={SWARM_STYLES.badge}>{step.role}</span>
            <span className="text-[11px] font-mono text-zinc-500 truncate">{step.timestamp}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded border border-[#1e2026] bg-[#111318] p-2.5">
              <span className="block text-[10px] font-mono uppercase text-zinc-500">Input</span>
              <span className="text-sm font-mono text-zinc-200">
                {step.usage.inputTokens.toLocaleString("en-US")}
              </span>
            </div>
            <div className="rounded border border-[#1e2026] bg-[#111318] p-2.5">
              <span className="block text-[10px] font-mono uppercase text-zinc-500">Output</span>
              <span className="text-sm font-mono text-sky-400">
                {step.usage.outputTokens.toLocaleString("en-US")}
              </span>
            </div>
            <div className="rounded border border-[#1e2026] bg-[#111318] p-2.5">
              <span className="block text-[10px] font-mono uppercase text-zinc-500">Cache Read</span>
              <span className="text-sm font-mono text-emerald-400">
                {step.usage.cacheReadTokens.toLocaleString("en-US")}
              </span>
            </div>
            <div className="rounded border border-[#1e2026] bg-[#111318] p-2.5">
              <span className="block text-[10px] font-mono uppercase text-zinc-500">Cache Write</span>
              <span className="text-sm font-mono text-amber-400">
                {step.usage.cacheWriteTokens.toLocaleString("en-US")}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
              Payload
            </span>
            <div className="rounded-md border border-[#1e2026] bg-[#090a0c] p-3 text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
              {step.content ?? step.summary}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
              Tool Calls ({step.toolCalls.length})
            </span>

            {step.toolCalls.length === 0 ? (
              <p className="text-xs font-mono text-zinc-500">No tool calls in this step.</p>
            ) : (
              step.toolCalls.map((tool) => {
                const isExpanded = Boolean(expandedToolIds[tool.id]);
                return (
                  <div
                    key={tool.id}
                    className="rounded border border-[#1e2026] bg-[#090a0c] px-2.5 py-2 text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => onToggleTool(tool.id)}
                      className="w-full flex items-center justify-between gap-2 text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 min-w-0 font-mono">
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        )}
                        <span className="text-zinc-200 font-medium">{tool.name}</span>
                        {tool.targetPath && (
                          <span className="text-zinc-500 truncate">{tool.targetPath}</span>
                        )}
                      </div>
                      <span
                        className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono ${
                          tool.status === "error"
                            ? "bg-rose-500/15 text-rose-400"
                            : tool.status === "pending"
                            ? "bg-amber-500/15 text-amber-300"
                            : "text-zinc-500"
                        }`}
                      >
                        {tool.status === "error" ? "ERR" : tool.status === "pending" ? "NO RESULT" : "OK"}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="mt-2 pt-2 border-t border-[#1e2026] flex flex-col gap-2 font-mono text-[11px] text-zinc-300">
                        <pre className="overflow-x-auto whitespace-pre-wrap text-zinc-400">
                          {tool.argumentsPreview}
                        </pre>
                        {tool.outputPreview ? (
                          <div className="rounded bg-[#111318] border border-[#1e2026] p-2 text-zinc-300 whitespace-pre-wrap break-words">
                            {tool.outputPreview}
                          </div>
                        ) : (
                          tool.status === "pending" && (
                            <div className="rounded bg-amber-500/10 border border-amber-500/20 p-2 text-amber-300/90">
                              Result not recorded (log ended before tool output was captured).
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
