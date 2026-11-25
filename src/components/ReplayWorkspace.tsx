"use client";

import { useReplayWorkspace } from "@/src/hooks/useReplayWorkspace";
import { AnalyticsHeader } from "./AnalyticsHeader";
import { REPLAY_STYLES } from "./ReplayStyles";
import { SessionSidebar } from "./SessionSidebar";
import { StepTimeline } from "./StepTimeline";

export function ReplayWorkspace() {
  const {
    sessions,
    selectedSession,
    selectedId,
    setSelectedId,
    stepFilter,
    setStepFilter,
    filteredSteps,
    analytics,
    expandedToolIds,
    toggleToolExpand,
    handleFileUpload,
    handleDeleteSession,
    handleRestoreDemos,
    hasDismissedDemos,
    uploadError,
  } = useReplayWorkspace();

  return (
    <div className={REPLAY_STYLES.shell}>
      <SessionSidebar
        sessions={sessions}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onUploadFile={handleFileUpload}
        onDeleteSession={handleDeleteSession}
        onRestoreDemos={handleRestoreDemos}
        hasDismissedDemos={hasDismissedDemos}
        uploadError={uploadError}
      />
      <main className={REPLAY_STYLES.mainPane}>
        {selectedSession && analytics ? (
          <>
            <AnalyticsHeader session={selectedSession} analytics={analytics} />
            <StepTimeline
              steps={filteredSteps}
              filter={stepFilter}
              onFilterChange={setStepFilter}
              expandedToolIds={expandedToolIds}
              onToggleTool={toggleToolExpand}
            />
          </>
        ) : (
          <div className="rounded-md border border-[#222429] bg-[#111317] p-8 text-center flex flex-col items-center gap-3">
            <p className="text-sm font-mono text-zinc-300">No session selected</p>
            <p className="text-xs text-zinc-500">
              Load a .jsonl session from the sidebar or restore the built-in demo sessions.
            </p>
            {hasDismissedDemos && (
              <button
                type="button"
                onClick={handleRestoreDemos}
                className="px-3 py-1.5 rounded border border-[#2d3038] bg-[#0b0c0e] hover:border-zinc-400 text-xs font-mono text-zinc-200 cursor-pointer"
              >
                Restore demo sessions
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
