export const SWARM_STYLES = {
  shell: "min-h-screen lg:h-screen lg:overflow-hidden bg-[#090a0c] text-zinc-200 flex flex-col lg:flex-row",
  centerCol: "flex-1 min-w-0 flex flex-col lg:h-screen lg:overflow-hidden",
  topBar: "shrink-0 border-b border-[#1e2026] bg-[#0c0e12] px-4 md:px-6 pt-3.5 flex flex-col gap-3",
  tabStrip: "flex items-center gap-1 overflow-x-auto",
  tabBase:
    "inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono border-b-2 transition-colors cursor-pointer whitespace-nowrap",
  tabActive: "border-zinc-100 text-zinc-100 font-medium",
  tabIdle: "border-transparent text-zinc-500 hover:text-zinc-300",
  scrollPane: "flex-1 min-h-0 overflow-y-auto p-4 md:p-6 flex flex-col gap-5",
  inspectorPane:
    "w-full lg:w-96 shrink-0 border-t lg:border-t-0 lg:border-l border-[#1e2026] bg-[#0c0e12] flex flex-col lg:h-screen lg:overflow-hidden",
  card: "rounded-md border border-[#1e2026] bg-[#111318] p-3.5 flex flex-col gap-2",
  statPill:
    "inline-flex items-center gap-1.5 rounded border border-[#1e2026] bg-[#111318] px-2.5 py-1 text-[11px] font-mono text-zinc-300",
  badge:
    "inline-flex items-center shrink-0 whitespace-nowrap rounded border border-[#252830] bg-[#090a0c] px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-zinc-400",
  kpiGrid:
    "grid grid-cols-2 lg:grid-cols-4 border border-[#1e2026] rounded-md bg-[#111318] divide-y lg:divide-y-0 lg:divide-x divide-[#1e2026] overflow-hidden",
  kpiCell: "p-3.5 flex flex-col gap-1",
  kpiLabel: "text-[11px] font-mono uppercase tracking-wider text-zinc-500",
  kpiValue: "text-xl font-semibold tracking-tight text-zinc-100 font-mono",
  kpiSub: "text-[11px] font-mono text-zinc-400",
  filterBar: "inline-flex items-center border border-[#1e2026] rounded-md bg-[#111318] p-0.5",
  filterBtnBase: "px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer",
  filterBtnActive: "bg-zinc-200 text-zinc-950 font-medium",
  filterBtnIdle: "text-zinc-400 hover:text-zinc-200",
} as const;
