"use client";

import { Activity, GitBranch, LayoutGrid, PanelRightClose, PanelRightOpen, ShieldAlert } from "lucide-react";
import { NormalizedSession, SessionAnalytics } from "@/src/types/session";
import { SWARM_STYLES } from "./SwarmStyles";

export type SwarmTab = "overview" | "board" | "graph" | "diagnostics";

interface SwarmHeaderProps {
  session: NormalizedSession;
  analytics: SessionAnalytics;
  contextCount: number;
  activeTab: SwarmTab;
  onTabChange: (tab: SwarmTab) => void;
  isInspectorOpen: boolean;
  onToggleInspector: () => void;
}

const HARNESS_LABELS: Record<NormalizedSession["harness"], string> = {
  antigravity: "Antigravity",
  "claude-code": "Claude Code",
  codex: "Codex CLI",
  opencode: "OpenCode",
  generic: "JSONL",
};

export function SwarmHeader({
  session,
  analytics,
  contextCount,
  activeTab,
  onTabChange,
  isInspectorOpen,
  onToggleInspector,
}: SwarmHeaderProps) {
  const warningCount = analytics.insights.filter((i) => i.severity === "warning").length;

  const tabs: Array<{
    id: SwarmTab;
    label: string;
    count?: number;
    icon: typeof LayoutGrid;
  }> = [
    { id: "overview", label: "Overview", icon: LayoutGrid },
    { id: "board", label: "Board", count: session.steps.length, icon: Activity },
    { id: "graph", label: "Graph", count: contextCount, icon: GitBranch },
    {
      id: "diagnostics",
      label: "Diagnostics",
      count: warningCount > 0 ? warningCount : analytics.insights.length,
      icon: ShieldAlert,
    },
  ];

  return (
    <header className={SWARM_STYLES.topBar}>
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className={SWARM_STYLES.badge}>{HARNESS_LABELS[session.harness]}</span>
            <h1 className="text-sm md:text-base font-semibold text-zinc-100 tracking-tight truncate">
              {session.title}
            </h1>
          </div>
          <p className="text-[11px] font-mono text-zinc-500 truncate">{session.model}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className={SWARM_STYLES.statPill}>
            <span className="text-zinc-500">COST</span>
            <span className="text-zinc-100">${analytics.estimatedCostUsd.toFixed(3)}</span>
          </span>
          <span className={SWARM_STYLES.statPill}>
            <span className="text-zinc-500">CACHE</span>
            <span className="text-emerald-400">{analytics.cacheHitRate.toFixed(1)}%</span>
          </span>
          <span className={SWARM_STYLES.statPill}>
            <span className="text-zinc-500">TIME</span>
            <span>{(analytics.totalDurationMs / 1000).toFixed(1)}s</span>
          </span>
          {analytics.errorCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-mono text-rose-300">
              {analytics.errorCount} err
            </span>
          )}
          <button
            type="button"
            onClick={onToggleInspector}
            title={isInspectorOpen ? "Hide inspector" : "Show inspector"}
            className="inline-flex items-center gap-1.5 rounded border border-[#252830] bg-[#111318] hover:border-zinc-500 px-2.5 py-1 text-[11px] font-mono text-zinc-300 cursor-pointer"
          >
            {isInspectorOpen ? (
              <PanelRightClose className="w-3.5 h-3.5" />
            ) : (
              <PanelRightOpen className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Inspector</span>
          </button>
        </div>
      </div>

      <nav className={SWARM_STYLES.tabStrip} aria-label="Swarm views">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`${SWARM_STYLES.tabBase} ${
                isActive ? SWARM_STYLES.tabActive : SWARM_STYLES.tabIdle
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] ${
                    tab.id === "diagnostics" && warningCount > 0
                      ? "bg-amber-500/15 text-amber-300"
                      : isActive
                      ? "bg-zinc-800 text-zinc-200"
                      : "bg-[#15181e] text-zinc-500"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
