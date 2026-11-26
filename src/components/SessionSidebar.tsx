"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, FolderGit2, Heart, RotateCcw, Terminal, Upload } from "lucide-react";
import { groupSessionsByProject } from "@/src/lib/analytics/sessionCompare";
import { NormalizedSession } from "@/src/types/session";
import { LocalScannerPanel } from "./LocalScannerPanel";
import { REPLAY_STYLES } from "./ReplayStyles";
import { SessionSidebarItem } from "./SessionSidebarItem";

interface SessionSidebarProps {
  sessions: NormalizedSession[];
  selectedId: string;
  onSelect: (id: string) => void;
  onUploadFile: (file: File) => void;
  onImportSessions: (sessions: NormalizedSession[]) => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, title: string) => void;
  onRestoreDemos: () => void;
  hasDismissedDemos: boolean;
  isHydrated: boolean;
  uploadError: string | null;
}

export function SessionSidebar({
  sessions,
  selectedId,
  onSelect,
  onUploadFile,
  onImportSessions,
  onDeleteSession,
  onRenameSession,
  onRestoreDemos,
  hasDismissedDemos,
  isHydrated,
  uploadError,
}: SessionSidebarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});

  const projectGroups = useMemo(() => groupSessionsByProject(sessions), [sessions]);

  const toggleProject = (project: string) => {
    setCollapsedProjects((prev) => ({ ...prev, [project]: !prev[project] }));
  };

  return (
    <aside className={REPLAY_STYLES.sidebar}>
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#1e2026]">
        <div className={REPLAY_STYLES.brandTitle}>
          <Terminal className="w-4 h-4 text-zinc-300" />
          <span>harness-replay</span>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-mono tracking-tight text-zinc-300 whitespace-nowrap">
          <span className="text-zinc-500">made by</span>
          <span>CNDN Dev</span>
          <Heart className="w-2.5 h-2.5 text-rose-400 fill-rose-400 shrink-0" aria-label="loves" />
          <span>Antigravity</span>
        </span>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) onUploadFile(file);
        }}
        className={REPLAY_STYLES.uploadBox}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".jsonl,.json,.txt"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUploadFile(file);
            e.target.value = "";
          }}
        />
        <div className="flex items-center justify-center gap-2 text-xs font-mono text-zinc-200">
          <Upload className="w-3.5 h-3.5 text-zinc-400" />
          <span>Load .jsonl session</span>
        </div>
        <p className="text-[11px] text-zinc-500 mt-1">Drop file or click to inspect</p>
      </div>

      {uploadError && (
        <p className="text-xs font-mono text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-md px-3 py-2">
          {uploadError}
        </p>
      )}

      <LocalScannerPanel onImportSessions={onImportSessions} />

      <div className="flex flex-col gap-2 overflow-y-auto">
        <div className="flex items-center justify-between px-0.5 pb-0.5">
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
            Sessions ({sessions.length})
          </span>
          {hasDismissedDemos && (
            <button
              type="button"
              onClick={onRestoreDemos}
              className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 cursor-pointer"
              title="Restore built-in demo sessions"
            >
              <RotateCcw className="w-3 h-3" />
              Restore demos
            </button>
          )}
        </div>

        {!isHydrated ? (
          <div className="rounded-md border border-[#222429] bg-[#0b0c0e] p-4 text-center text-xs font-mono text-zinc-500">
            Loading saved sessions...
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-md border border-[#222429] bg-[#0b0c0e] p-4 text-center text-xs font-mono text-zinc-500">
            No sessions saved. Load a .jsonl file above.
          </div>
        ) : (
          projectGroups.map((group) => {
            const isCollapsed = Boolean(collapsedProjects[group.project]);
            return (
              <div key={group.project} className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleProject(group.project)}
                  className="flex items-center justify-between gap-2 px-1 py-0.5 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  <span className="inline-flex items-center gap-1.5 min-w-0 truncate">
                    {isCollapsed ? (
                      <ChevronRight className="w-3 h-3 shrink-0" />
                    ) : (
                      <ChevronDown className="w-3 h-3 shrink-0" />
                    )}
                    <FolderGit2 className="w-3 h-3 shrink-0 text-zinc-500" />
                    <span className="truncate">{group.project}</span>
                  </span>
                  <span className="text-[10px] text-zinc-500">{group.sessions.length}</span>
                </button>
                {!isCollapsed &&
                  group.sessions.map((session) => (
                    <SessionSidebarItem
                      key={session.id}
                      session={session}
                      isActive={session.id === selectedId}
                      onSelect={onSelect}
                      onRename={onRenameSession}
                      onDelete={onDeleteSession}
                    />
                  ))}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
