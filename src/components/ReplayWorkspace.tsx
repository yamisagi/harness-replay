"use client";

import { useReplayWorkspace } from "@/src/hooks/useReplayWorkspace";
import { BoardTab } from "./BoardTab";
import { CompareTab } from "./CompareTab";
import { ContextGraphTab } from "./ContextGraphTab";
import { DiagnosticsTab } from "./DiagnosticsTab";
import { OverviewTab } from "./OverviewTab";
import { SessionSidebar } from "./SessionSidebar";
import { StepInspector } from "./StepInspector";
import { SwarmHeader } from "./SwarmHeader";
import { SWARM_STYLES } from "./SwarmStyles";

export function ReplayWorkspace() {
  const {
    sessions,
    selectedSession,
    selectedId,
    setSelectedId,
    activeTab,
    setActiveTab,
    selectedStepId,
    selectedStepSessionId,
    selectedStep,
    selectStep,
    isInspectorOpen,
    setIsInspectorOpen,
    stepFilter,
    setStepFilter,
    filteredSteps,
    analytics,
    sessionGraph,
    expandedToolIds,
    toggleToolExpand,
    handleFileUpload,
    handleImportSessions,
    handleDeleteSession,
    handleRenameSession,
    handleRestoreDemos,
    hasDismissedDemos,
    isHydrated,
    uploadError,
    compare,
  } = useReplayWorkspace();

  const handleJumpToStep = (stepId: string) => {
    selectStep(stepId);
    setActiveTab("board");
  };

  return (
    <div className={SWARM_STYLES.shell}>
      <SessionSidebar
        sessions={sessions}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onUploadFile={handleFileUpload}
        onImportSessions={handleImportSessions}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        onRestoreDemos={handleRestoreDemos}
        hasDismissedDemos={hasDismissedDemos}
        isHydrated={isHydrated}
        uploadError={uploadError}
      />

      <main className={SWARM_STYLES.centerCol}>
        {selectedSession && analytics && sessionGraph ? (
          <>
            <SwarmHeader
              session={selectedSession}
              analytics={analytics}
              contextCount={sessionGraph.contextNodes.length}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              isInspectorOpen={isInspectorOpen}
              onToggleInspector={() => setIsInspectorOpen((prev) => !prev)}
            />
            <div className={SWARM_STYLES.scrollPane}>
              {activeTab === "overview" && (
                <OverviewTab
                  session={selectedSession}
                  analytics={analytics}
                  onNavigateTab={setActiveTab}
                />
              )}
              {activeTab === "board" && (
                <BoardTab
                  steps={filteredSteps}
                  filter={stepFilter}
                  onFilterChange={setStepFilter}
                  selectedStepId={selectedStepId}
                  onSelectStep={selectStep}
                />
              )}
              {activeTab === "graph" && (
                <ContextGraphTab
                  graph={sessionGraph}
                  selectedStepId={selectedStepId}
                  onSelectStep={selectStep}
                />
              )}
              {activeTab === "diagnostics" && (
                <DiagnosticsTab
                  analytics={analytics}
                  contextNodes={sessionGraph.contextNodes}
                  onJumpToStep={handleJumpToStep}
                />
              )}
              {activeTab === "compare" && (
                <CompareTab
                  left={selectedSession}
                  leftAnalytics={analytics}
                  right={compare.compareSession}
                  rightAnalytics={compare.compareAnalytics}
                  sameTaskCandidates={compare.sameTaskCandidates}
                  sameProjectCandidates={compare.sameProjectCandidates}
                  otherCandidates={compare.otherCandidates}
                  comparison={compare.comparison}
                  selectedStepId={selectedStepId}
                  selectedStepSessionId={selectedStepSessionId}
                  onSelectRightId={compare.setCompareTargetId}
                  onSwap={compare.swapCompareSessions}
                  onSelectStep={selectStep}
                />
              )}
            </div>
          </>
        ) : !isHydrated ? (
          <div className="p-6">
            <div className="rounded-md border border-[#1e2026] bg-[#111318] p-8 text-center">
              <p className="text-xs font-mono text-zinc-500">Loading workspace...</p>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className="rounded-md border border-[#1e2026] bg-[#111318] p-8 text-center flex flex-col items-center gap-3">
              <p className="text-sm font-mono text-zinc-300">No session selected</p>
              <p className="text-xs text-zinc-500">
                Load a .jsonl session from the sidebar or restore the built-in demo sessions.
              </p>
              {hasDismissedDemos && (
                <button
                  type="button"
                  onClick={handleRestoreDemos}
                  className="px-3 py-1.5 rounded border border-[#2d3038] bg-[#090a0c] hover:border-zinc-400 text-xs font-mono text-zinc-200 cursor-pointer"
                >
                  Restore demo sessions
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {selectedSession && isInspectorOpen && (
        <StepInspector
          step={selectedStep}
          expandedToolIds={expandedToolIds}
          onToggleTool={toggleToolExpand}
          onClose={() => setIsInspectorOpen(false)}
        />
      )}
    </div>
  );
}
