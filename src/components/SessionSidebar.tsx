"use client";

import { useRef } from "react";
import { RotateCcw, Terminal, Trash2, Upload } from "lucide-react";
import { NormalizedSession } from "@/src/types/session";
import { REPLAY_STYLES } from "./ReplayStyles";

interface SessionSidebarProps {
  sessions: NormalizedSession[];
  selectedId: string;
  onSelect: (id: string) => void;
  onUploadFile: (file: File) => void;
  onDeleteSession: (id: string) => void;
  onRestoreDemos: () => void;
  hasDismissedDemos: boolean;
  uploadError: string | null;
}

const HARNESS_LABELS: Record<NormalizedSession["harness"], string> = {
  antigravity: "Antigravity",
  "claude-code": "Claude Code",
  codex: "Codex CLI",
  opencode: "OpenCode",
  generic: "JSONL",
};

export function SessionSidebar({
  sessions,
  selectedId,
  onSelect,
  onUploadFile,
  onDeleteSession,
  onRestoreDemos,
  hasDismissedDemos,
  uploadError,
}: SessionSidebarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <aside className={REPLAY_STYLES.sidebar}>
      <div className={REPLAY_STYLES.brandRow}>
        <div className={REPLAY_STYLES.brandTitle}>
          <Terminal className="w-4 h-4 text-zinc-300" />
          <span>harness-replay</span>
        </div>
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
        <p className="text-[11px] text-zinc-500 mt-1">
          Drop file or click to inspect
        </p>
      </div>

      {uploadError && (
        <p className="text-xs font-mono text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-md px-3 py-2">
          {uploadError}
        </p>
      )}

      <div className="flex flex-col gap-1.5 overflow-y-auto">
        <div className="flex items-center justify-between px-0.5 pb-1">
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

        {sessions.length === 0 ? (
          <div className="rounded-md border border-[#222429] bg-[#0b0c0e] p-4 text-center text-xs font-mono text-zinc-500">
            No sessions saved. Load a .jsonl file above.
          </div>
        ) : (
          sessions.map((session) => {
            const isActive = session.id === selectedId;
            return (
              <div
                key={session.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(session.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(session.id);
                  }
                }}
                className={`group ${REPLAY_STYLES.sessionItemBase} ${
                  isActive ? REPLAY_STYLES.sessionItemActive : REPLAY_STYLES.sessionItemIdle
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-zinc-200 rounded-r" />
                )}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                    {HARNESS_LABELS[session.harness]}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {session.steps.length} steps
                    </span>
                    <button
                      type="button"
                      aria-label={`Delete ${session.title}`}
                      title="Remove session"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(session.id);
                      }}
                      className="p-1.5 rounded border border-[#272a32] bg-[#14161b] text-zinc-400 hover:text-rose-300 hover:border-rose-500/40 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs font-medium text-zinc-100 line-clamp-1">{session.title}</p>
                <p className="text-[11px] text-zinc-500 font-mono truncate">{session.model}</p>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
