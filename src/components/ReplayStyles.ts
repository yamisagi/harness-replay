export const REPLAY_STYLES = {
  shell: "min-h-screen bg-[#0b0c0e] text-zinc-200 flex flex-col lg:flex-row",
  sidebar:
    "w-full lg:w-80 shrink-0 border-b lg:border-b-0 lg:border-r border-[#1e2026] bg-[#0c0e12] p-4 flex flex-col gap-4 lg:h-screen lg:overflow-y-auto",
  brandRow: "flex items-center justify-between gap-2 pb-3 border-b border-[#222429]",
  brandTitle: "text-sm font-semibold tracking-tight text-zinc-100 flex items-center gap-2 font-mono",
  uploadBox:
    "rounded-md border border-dashed border-[#2d3038] hover:border-zinc-400 bg-[#0b0c0e] p-3 text-center transition-colors cursor-pointer",
  sessionItemBase:
    "relative w-full text-left rounded-md border px-3 py-2.5 transition-colors cursor-pointer flex flex-col gap-1",
  sessionItemActive: "border-zinc-600 bg-[#15181e] text-zinc-100",
  sessionItemIdle: "border-[#222429] bg-[#0b0c0e] hover:border-zinc-700 text-zinc-300",
  mainPane: "flex-1 min-w-0 p-4 md:p-6 lg:p-8 flex flex-col gap-6 max-w-6xl",
  telemetryGrid:
    "grid grid-cols-2 lg:grid-cols-4 border border-[#222429] rounded-md bg-[#111317] divide-y lg:divide-y-0 lg:divide-x divide-[#222429] overflow-hidden",
  telemetryCell: "p-3.5 flex flex-col gap-1",
  telemetryLabel: "text-[11px] font-mono uppercase tracking-wider text-zinc-500",
  telemetryValue: "text-xl font-semibold tracking-tight text-zinc-100 font-mono",
  telemetrySub: "text-[11px] font-mono text-zinc-400",
  breakdownWrap: "border border-[#222429] rounded-md bg-[#111317] p-3 flex flex-col gap-2",
  breakdownTrack: "h-2 w-full rounded-sm bg-[#1a1d23] overflow-hidden flex",
  diagnosticRow:
    "rounded-md border border-[#222429] bg-[#111317] border-l-2 px-3.5 py-2.5 flex flex-col gap-1.5 text-sm",
  insightActionBox:
    "mt-1 rounded border border-[#222429] bg-[#0b0c0e] px-2.5 py-1.5 text-xs text-zinc-200 font-mono",
  insightTag:
    "inline-flex items-center rounded border border-[#272a32] bg-[#0b0c0e] px-2 py-0.5 text-[11px] font-mono text-zinc-300",
  filterBar: "inline-flex items-center border border-[#222429] rounded-md bg-[#111317] p-0.5",
  filterBtnBase: "px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer",
  filterBtnActive: "bg-zinc-200 text-zinc-950 font-medium",
  filterBtnIdle: "text-zinc-400 hover:text-zinc-200",
  timelineWrap: "relative flex flex-col",
  timelineRail: "absolute left-[11px] top-3 bottom-3 w-px bg-[#272a32]",
  timelineRow: "relative pl-8 pb-5 last:pb-0 group",
  timelineNodeBase:
    "absolute left-[6px] top-1.5 w-[11px] h-[11px] rounded-full border-2 transition-transform group-hover:scale-110",
  stepPanel:
    "rounded-md border border-[#222429] bg-[#111317] group-hover:border-[#323640] transition-colors p-3.5 flex flex-col gap-2.5",
  toolBox: "rounded border border-[#222429] bg-[#0b0c0e] px-3 py-2 text-xs",
} as const;
