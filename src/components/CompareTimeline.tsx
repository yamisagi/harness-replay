"use client";

import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { NormalizedSession, SessionStep } from "@/src/types/session";
import { SWARM_STYLES } from "./SwarmStyles";

interface CompareTimelineProps {
  left: NormalizedSession;
  right: NormalizedSession;
  selectedStepId: string | null;
  selectedStepSessionId: string | null;
  onSelectStep: (stepId: string, sessionId: string) => void;
}

function StepColumn({
  label,
  session,
  selectedStepId,
  selectedStepSessionId,
  onSelectStep,
}: {
  label: string;
  session: NormalizedSession;
  selectedStepId: string | null;
  selectedStepSessionId: string | null;
  onSelectStep: (stepId: string, sessionId: string) => void;
}) {
  return (
    <div className={SWARM_STYLES.card}>
      <div className="flex items-center justify-between gap-2 pb-1 border-b border-[#1e2026]">
        <div className="flex items-center gap-2 min-w-0">
          <span className={SWARM_STYLES.badge}>{label}</span>
          <span className="text-xs font-mono text-zinc-200 truncate">{session.harness}</span>
        </div>
        <span className="text-[11px] font-mono text-zinc-500">{session.steps.length} steps</span>
      </div>

      <div className="flex flex-col gap-1.5 max-h-96 overflow-y-auto pr-1">
        {session.steps.map((step) => (
          <StepRow
            key={step.id}
            step={step}
            isSelected={selectedStepSessionId === session.id && selectedStepId === step.id}
            onClick={() => onSelectStep(step.id, session.id)}
          />
        ))}
      </div>
    </div>
  );
}

function StepRow({
  step,
  isSelected,
  onClick,
}: {
  step: SessionStep;
  isSelected: boolean;
  onClick: () => void;
}) {
  const errCount = step.toolCalls.filter((t) => t.status === "error").length;
  const totalStepTokens =
    step.usage.inputTokens +
    step.usage.outputTokens +
    step.usage.cacheReadTokens +
    step.usage.cacheWriteTokens;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded border px-2.5 py-2 transition-colors cursor-pointer flex flex-col gap-1 ${
        isSelected
          ? "border-zinc-400 bg-[#181b22]"
          : "border-[#1e2026] bg-[#0b0c0e] hover:border-[#2d3038]"
      }`}
    >
      <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
        <span className="text-zinc-400">
          #{step.index} · <span className="uppercase text-zinc-300">{step.role}</span>
        </span>
        <div className="flex items-center gap-2 text-zinc-500">
          <span>{totalStepTokens.toLocaleString()} tok</span>
          {step.durationMs !== undefined && (
            <span className="inline-flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {(step.durationMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-zinc-200 line-clamp-2">{step.summary}</p>

      {step.toolCalls.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          {step.toolCalls.slice(0, 4).map((tc) => (
            <span
              key={tc.id}
              className="inline-flex items-center gap-1 rounded border border-[#252830] bg-[#111318] px-1.5 py-0.5 text-[10px] font-mono text-zinc-400"
            >
              {tc.status === "error" ? (
                <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />
              ) : (
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
              )}
              {tc.name}
            </span>
          ))}
          {step.toolCalls.length > 4 && (
            <span className="text-[10px] font-mono text-zinc-500">
              +{step.toolCalls.length - 4} more
            </span>
          )}
          {errCount > 0 && (
            <span className="text-[10px] font-mono text-rose-300 ml-auto">{errCount} err</span>
          )}
        </div>
      )}
    </button>
  );
}

export function CompareTimeline({
  left,
  right,
  selectedStepId,
  selectedStepSessionId,
  onSelectStep,
}: CompareTimelineProps) {
  return (
    <div className={SWARM_STYLES.compareGrid}>
      <StepColumn
        label="Session A"
        session={left}
        selectedStepId={selectedStepId}
        selectedStepSessionId={selectedStepSessionId}
        onSelectStep={onSelectStep}
      />
      <StepColumn
        label="Session B"
        session={right}
        selectedStepId={selectedStepId}
        selectedStepSessionId={selectedStepSessionId}
        onSelectStep={onSelectStep}
      />
    </div>
  );
}
