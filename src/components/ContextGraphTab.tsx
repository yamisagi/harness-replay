"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CTX_NODE_H,
  CTX_NODE_W,
  SessionGraphData,
  STEP_NODE_H,
  STEP_NODE_W,
} from "@/src/lib/analytics/sessionGraph";
import { SWARM_STYLES } from "./SwarmStyles";

interface ContextGraphTabProps {
  graph: SessionGraphData;
  selectedStepId: string | null;
  onSelectStep: (stepId: string) => void;
}

type GraphFilter = "all" | "files" | "issues";

export function ContextGraphTab({ graph, selectedStepId, onSelectStep }: ContextGraphTabProps) {
  const [filter, setFilter] = useState<GraphFilter>("all");
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

  useEffect(() => {
    setFocusedNodeId(null);
  }, [graph, filter]);

  const counts = useMemo(
    () => ({
      all: graph.contextNodes.length,
      files: graph.contextNodes.filter((n) => n.kind === "file").length,
      issues: graph.contextNodes.filter((n) => n.hasError || n.isDuplicateRead).length,
    }),
    [graph.contextNodes]
  );

  const visibleContextNodes = useMemo(
    () =>
      graph.contextNodes
        .filter((n) =>
          filter === "files" ? n.kind === "file" : filter === "issues" ? n.hasError || n.isDuplicateRead : true
        )
        .map((n, idx) => ({ ...n, y: 20 + idx * (CTX_NODE_H + 16) })),
    [graph.contextNodes, filter]
  );

  const visibleContextMap = useMemo(
    () => new Map(visibleContextNodes.map((n) => [n.id, n])),
    [visibleContextNodes]
  );

  const visibleContextEdges = useMemo(
    () => graph.edges.filter((e) => e.kind === "context" && visibleContextMap.has(e.toId)),
    [graph.edges, visibleContextMap]
  );

  const filteredStepIds = useMemo(() => {
    const ids = new Set(visibleContextEdges.map((e) => e.fromId));
    if (filter === "issues") graph.stepNodes.forEach((s) => s.hasError && ids.add(s.id));
    return ids;
  }, [visibleContextEdges, filter, graph.stepNodes]);

  const activeNodeSet = useMemo(() => {
    const set = new Set<string>();
    if (!focusedNodeId) return set;
    set.add(focusedNodeId);
    visibleContextEdges.forEach((e) => {
      if (e.fromId === focusedNodeId) set.add(e.toId);
      if (e.toId === focusedNodeId) set.add(e.fromId);
    });
    return set;
  }, [focusedNodeId, visibleContextEdges]);

  const hasFocus = activeNodeSet.size > 0;
  const stepMap = useMemo(() => new Map(graph.stepNodes.map((n) => [n.id, n])), [graph.stepNodes]);
  const stepBottom = graph.stepNodes.at(-1)?.y ? graph.stepNodes.at(-1)!.y + STEP_NODE_H : 20;
  const ctxBottom = visibleContextNodes.at(-1)?.y ? visibleContextNodes.at(-1)!.y + CTX_NODE_H : 80;
  const svgHeight = Math.max(220, stepBottom + 24, ctxBottom + 24);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-zinc-400">
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-zinc-500" /> Flow</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-sky-400" /> Context Link</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-amber-400" /> Duplicate Read</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-rose-400" /> Tool Error</span>
        </div>

        <div className="flex items-center gap-2">
          {focusedNodeId && (
            <button
              type="button"
              onClick={() => setFocusedNodeId(null)}
              className="px-2.5 py-1 rounded border border-[#252830] bg-[#111318] text-[11px] font-mono text-zinc-300 hover:text-zinc-100 cursor-pointer"
            >
              Clear focus
            </button>
          )}
          <div className={SWARM_STYLES.filterBar}>
            {(["all", "files", "issues"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`${SWARM_STYLES.filterBtnBase} capitalize ${
                  filter === f ? SWARM_STYLES.filterBtnActive : SWARM_STYLES.filterBtnIdle
                }`}
              >
                {f} ({counts[f]})
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-md border border-[#1e2026] bg-[#0c0e12] overflow-x-auto p-3">
        <svg viewBox={`0 0 ${graph.width} ${svgHeight}`} className="w-full h-auto min-w-[640px] select-none">
          {graph.edges.filter((e) => e.kind === "flow").map((edge) => {
            const from = stepMap.get(edge.fromId);
            const to = stepMap.get(edge.toId);
            if (!from || !to) return null;
            return (
              <line key={edge.id} x1={from.x + 18} y1={from.y + STEP_NODE_H} x2={from.x + 18} y2={to.y} stroke="#2a2e38" strokeWidth={1.5} />
            );
          })}

          {visibleContextEdges.map((edge) => {
            const from = stepMap.get(edge.fromId);
            const to = visibleContextMap.get(edge.toId);
            if (!from || !to) return null;
            const x1 = from.x + STEP_NODE_W;
            const y1 = from.y + STEP_NODE_H / 2;
            const x2 = to.x;
            const y2 = to.y + CTX_NODE_H / 2;
            const dx = (x2 - x1) * 0.48;
            const isHi = hasFocus && activeNodeSet.has(edge.fromId) && activeNodeSet.has(edge.toId);
            const stroke = edge.isError ? "#fb7185" : edge.isDuplicate ? "#fbbf24" : isHi ? "#38bdf8" : "#3f4654";
            return (
              <path
                key={edge.id}
                d={`M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`}
                fill="none" stroke={stroke} strokeWidth={isHi ? 2 : 1.25} opacity={hasFocus && !isHi ? 0.16 : 0.85}
              />
            );
          })}

          {graph.stepNodes.map((node) => {
            const isSelected = node.stepId === selectedStepId;
            const isFocused = focusedNodeId === node.id;
            const dimmed = (hasFocus && !activeNodeSet.has(node.id)) || (!hasFocus && filter !== "all" && !filteredStepIds.has(node.id));
            const border = node.hasError ? "#fb7185" : isFocused || isSelected ? "#34d399" : "#272b35";
            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => { setFocusedNodeId((prev) => (prev === node.id ? null : node.id)); onSelectStep(node.stepId); }}
                className="cursor-pointer"
                opacity={dimmed ? 0.35 : 1}
              >
                <rect width={STEP_NODE_W} height={STEP_NODE_H} rx={6} fill={isSelected ? "#161b24" : "#111318"} stroke={border} strokeWidth={isFocused || isSelected ? 1.5 : 1} />
                <text x={10} y={18} fill="#71717a" fontSize={10} fontFamily="monospace">
                  #{String(node.index).padStart(2, "0")} · {node.role.toUpperCase()}
                </text>
                <text x={10} y={35} fill="#e4e4e7" fontSize={11} fontFamily="sans-serif">
                  {node.label.slice(0, 34)}{node.label.length > 34 ? "…" : ""}
                </text>
                <text x={STEP_NODE_W - 10} y={18} textAnchor="end" fill="#a1a1aa" fontSize={10} fontFamily="monospace">
                  {node.totalTokens.toLocaleString("en-US")} tok
                </text>
              </g>
            );
          })}

          {visibleContextNodes.length === 0 ? (
            <g transform="translate(460, 20)">
              <rect width={CTX_NODE_W} height={54} rx={6} fill="#111318" stroke="#1e2026" strokeDasharray="4 4" />
              <text x={165} y={31} textAnchor="middle" fill="#71717a" fontSize={11} fontFamily="monospace">
                No {filter === "issues" ? "errors or duplicate reads" : "matching context nodes"}
              </text>
            </g>
          ) : (
            visibleContextNodes.map((node) => {
              const isFocused = focusedNodeId === node.id;
              const border = node.hasError ? "#fb7185" : node.isDuplicateRead ? "#fbbf24" : isFocused ? "#38bdf8" : "#272b35";
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => setFocusedNodeId((prev) => (prev === node.id ? null : node.id))}
                  className="cursor-pointer"
                  opacity={hasFocus && !activeNodeSet.has(node.id) ? 0.35 : 1}
                >
                  <rect width={CTX_NODE_W} height={CTX_NODE_H} rx={6} fill={isFocused ? "#141a24" : "#111318"} stroke={border} strokeWidth={isFocused ? 1.5 : 1} />
                  <text x={10} y={16} fill="#71717a" fontSize={10} fontFamily="monospace">
                    {node.kind.toUpperCase()} · {node.touchCount}x{node.isDuplicateRead ? " · DUP" : ""}
                  </text>
                  <text x={10} y={32} fill="#e4e4e7" fontSize={11} fontFamily="monospace">
                    {node.label.slice(0, 38)}{node.label.length > 38 ? "…" : ""}
                  </text>
                </g>
              );
            })
          )}
        </svg>
      </div>
    </div>
  );
}
