"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, FolderSearch, Loader2, Plus, Trash2, X } from "lucide-react";
import { useLocalSessions } from "@/src/hooks/useLocalSessions";
import { NormalizedSession } from "@/src/types/session";

interface LocalScannerPanelProps {
  onImportSessions: (sessions: NormalizedSession[]) => void;
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getFullYear()).slice(-2)}`;
}

export function LocalScannerPanel({ onImportSessions }: LocalScannerPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pathInput, setPathInput] = useState("");
  const {
    presets,
    customDirs,
    selectedDirs,
    scanned,
    checkedPaths,
    hasScanned,
    isScanning,
    isLoadingBatch,
    loadingPath,
    error,
    toggleDir,
    addCustomDir,
    removeCustomDir,
    scan,
    toggleChecked,
    toggleSelectAll,
    clearScanned,
    loadSession,
    loadSelectedSessions,
  } = useLocalSessions(onImportSessions);

  const handleAddPath = () => {
    if (!pathInput.trim()) return;
    addCustomDir(pathInput);
    setPathInput("");
  };

  return (
    <div className="rounded-md border border-[#222429] bg-[#0b0c0e]">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-mono text-zinc-300 hover:text-zinc-100 cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <FolderSearch className="w-3.5 h-3.5 text-zinc-400" />
          <span>Scan local logs</span>
          {scanned.length > 0 && (
            <span className="px-1.5 py-0.2 rounded bg-[#181b22] text-[10px] text-zinc-400">
              {scanned.length}
            </span>
          )}
        </span>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />}
      </button>

      {isOpen && (
        <div className="border-t border-[#222429] p-2.5 flex flex-col gap-2.5">
          <div className="flex flex-col gap-1">
            {presets.map((preset) => (
              <label
                key={preset.id}
                title={preset.path}
                className="flex items-center justify-between gap-2 text-[11px] font-mono text-zinc-300 cursor-pointer py-0.5"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <input type="checkbox" checked={selectedDirs.includes(preset.path)} onChange={() => toggleDir(preset.path)} className="accent-zinc-300 cursor-pointer" />
                  <span className="truncate">{preset.label}</span>
                </span>
                <span className={`text-[10px] shrink-0 ${preset.exists ? "text-emerald-400" : "text-zinc-600"}`}>
                  {preset.exists ? "found" : "missing"}
                </span>
              </label>
            ))}

            {customDirs.map((dir) => (
              <div key={dir} className="flex items-center justify-between gap-1.5 text-[11px] font-mono text-zinc-300 py-0.5">
                <label className="flex items-center gap-1.5 truncate cursor-pointer">
                  <input type="checkbox" checked={selectedDirs.includes(dir)} onChange={() => toggleDir(dir)} className="accent-zinc-300 cursor-pointer" />
                  <span className="truncate" title={dir}>{dir}</span>
                </label>
                <button type="button" onClick={() => removeCustomDir(dir)} aria-label={`Remove ${dir}`} className="text-zinc-500 hover:text-rose-300 cursor-pointer shrink-0">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-1.5">
            <input
              type="text"
              value={pathInput}
              onChange={(e) => setPathInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddPath()}
              placeholder="Add custom folder..."
              className="flex-1 min-w-0 rounded border border-[#222429] bg-[#111317] px-2 py-1 text-[11px] font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
            />
            <button type="button" onClick={handleAddPath} title="Add directory" className="px-2 py-1 rounded border border-[#272a32] bg-[#14161b] text-zinc-300 hover:text-zinc-100 hover:border-zinc-500 cursor-pointer">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={scan}
            disabled={isScanning}
            className="w-full flex items-center justify-center gap-1.5 rounded border border-[#2d3038] bg-[#14161b] hover:border-zinc-400 disabled:opacity-50 px-2.5 py-1.5 text-[11px] font-mono text-zinc-200 cursor-pointer"
          >
            {isScanning && <Loader2 className="w-3 h-3 animate-spin" />}
            <span>{isScanning ? "Scanning..." : "Scan selected"}</span>
          </button>

          {error && (
            <p className="text-[11px] font-mono text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded px-2 py-1">
              {error}
            </p>
          )}

          {hasScanned && !isScanning && (
            <div className="flex flex-col gap-1.5 pt-1.5 border-t border-[#222429]">
              <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-zinc-500">
                <span>Found ({scanned.length})</span>
                <div className="flex items-center gap-2">
                  {scanned.length > 0 && (
                    <button type="button" onClick={toggleSelectAll} className="hover:text-zinc-200 cursor-pointer">
                      {checkedPaths.length === scanned.length ? "Clear selection" : "Select all"}
                    </button>
                  )}
                  <button type="button" onClick={clearScanned} title="Clear scanned list" className="inline-flex items-center gap-1 hover:text-rose-300 cursor-pointer">
                    <Trash2 className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>

              {checkedPaths.length > 0 && (
                <button
                  type="button"
                  onClick={loadSelectedSessions}
                  disabled={isLoadingBatch}
                  className="w-full flex items-center justify-center gap-1.5 rounded border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-50 px-2 py-1 text-[11px] font-mono text-emerald-300 cursor-pointer"
                >
                  {isLoadingBatch && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>{isLoadingBatch ? "Loading..." : `Load selected (${checkedPaths.length})`}</span>
                </button>
              )}

              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                {scanned.length === 0 ? (
                  <p className="text-[11px] font-mono text-zinc-500 text-center py-2">No valid .jsonl sessions found.</p>
                ) : (
                  scanned.map((item) => {
                    const isLoading = loadingPath === item.filePath;
                    return (
                      <div key={item.filePath} className="flex items-center gap-1.5 rounded border border-[#222429] bg-[#111317] hover:border-zinc-500 px-2 py-1.5">
                        <input
                          type="checkbox"
                          checked={checkedPaths.includes(item.filePath)}
                          onChange={() => toggleChecked(item.filePath)}
                          aria-label={`Select ${item.title}`}
                          className="accent-emerald-400 cursor-pointer shrink-0"
                        />
                        <button
                          type="button"
                          onClick={() => loadSession(item.filePath)}
                          disabled={isLoading || isLoadingBatch}
                          title={item.filePath}
                          className="flex-1 min-w-0 text-left flex flex-col gap-0.5 cursor-pointer disabled:opacity-60"
                        >
                          <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-zinc-400">
                            <span className="uppercase">{item.harness}</span>
                            <span>{isLoading ? "loading..." : `${formatShortDate(item.modifiedAt)} · ${item.stepCount} steps`}</span>
                          </div>
                          <span className="text-[11px] text-zinc-200 truncate">{item.title}</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
