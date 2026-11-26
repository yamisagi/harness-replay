"use client";

import { useState } from "react";
import { Check, Pencil, Trash2 } from "lucide-react";
import { NormalizedSession } from "@/src/types/session";
import { REPLAY_STYLES } from "./ReplayStyles";

const HARNESS_LABELS: Record<NormalizedSession["harness"], string> = {
  antigravity: "Antigravity",
  "claude-code": "Claude Code",
  codex: "Codex CLI",
  opencode: "OpenCode",
  generic: "JSONL",
};

interface SessionSidebarItemProps {
  session: NormalizedSession;
  isActive: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

export function SessionSidebarItem({
  session,
  isActive,
  onSelect,
  onRename,
  onDelete,
}: SessionSidebarItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(session.title);

  const commitRename = () => {
    if (draftTitle.trim()) onRename(session.id, draftTitle);
    setIsEditing(false);
  };

  return (
    <div
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
            aria-label={`Rename ${session.title}`}
            title="Rename session"
            onClick={(e) => {
              e.stopPropagation();
              setDraftTitle(session.title);
              setIsEditing(true);
            }}
            className="p-1.5 rounded border border-[#272a32] bg-[#14161b] text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors cursor-pointer"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            type="button"
            aria-label={`Delete ${session.title}`}
            title="Remove session"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(session.id);
            }}
            className="p-1.5 rounded border border-[#272a32] bg-[#14161b] text-zinc-400 hover:text-rose-300 hover:border-rose-500/40 hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <input
            autoFocus
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") setIsEditing(false);
            }}
            onBlur={commitRename}
            className="flex-1 min-w-0 rounded border border-zinc-500 bg-[#090a0c] px-1.5 py-0.5 text-xs text-zinc-100 focus:outline-none"
          />
          <button
            type="button"
            aria-label="Save title"
            onMouseDown={(e) => e.preventDefault()}
            onClick={commitRename}
            className="p-1 rounded bg-zinc-800 text-emerald-300 hover:bg-zinc-700 cursor-pointer"
          >
            <Check className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <p className="text-xs font-medium text-zinc-100 line-clamp-1">{session.title}</p>
      )}
      <p className="text-[11px] text-zinc-500 font-mono truncate">{session.model}</p>
    </div>
  );
}
