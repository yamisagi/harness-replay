"use client";

import { useEffect, useMemo, useState } from "react";
import { SwarmTab } from "@/src/components/SwarmHeader";
import { DEMO_SESSIONS } from "@/src/data/mockSessions";
import { analyzeSession } from "@/src/lib/analytics/sessionAnalytics";
import { buildSessionGraph } from "@/src/lib/analytics/sessionGraph";
import { parseJsonlSession } from "@/src/lib/parsers/jsonlParser";
import {
  loadStoredSessionState,
  saveDismissedDemos,
  saveUploadedSessions,
} from "@/src/lib/storage/sessionStorage";
import { NormalizedSession, StepRole } from "@/src/types/session";

export type StepFilter = "all" | StepRole | "errors";

export function useReplayWorkspace() {
  const [uploadedSessions, setUploadedSessions] = useState<NormalizedSession[]>([]);
  const [dismissedDemoIds, setDismissedDemoIds] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string>(DEMO_SESSIONS[0].id);
  const [activeTab, setActiveTab] = useState<SwarmTab>("overview");
  const [selectedStepId, setSelectedStepId] = useState<string | null>(
    DEMO_SESSIONS[0].steps[0]?.id ?? null
  );
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [stepFilter, setStepFilter] = useState<StepFilter>("all");
  const [expandedToolIds, setExpandedToolIds] = useState<Record<string, boolean>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadStoredSessionState();
    setUploadedSessions(stored.uploaded);
    setDismissedDemoIds(stored.dismissedDemoIds);
    if (stored.uploaded.length > 0) {
      setSelectedId(stored.uploaded[0].id);
    } else {
      const firstDemo = DEMO_SESSIONS.find((d) => !stored.dismissedDemoIds.includes(d.id));
      setSelectedId(firstDemo?.id ?? "");
    }
  }, []);

  const sessions = useMemo(() => {
    const activeDemos = DEMO_SESSIONS.filter((d) => !dismissedDemoIds.includes(d.id));
    return [...uploadedSessions, ...activeDemos];
  }, [uploadedSessions, dismissedDemoIds]);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedId) ?? sessions[0] ?? null,
    [sessions, selectedId]
  );

  const analytics = useMemo(
    () => (selectedSession ? analyzeSession(selectedSession) : null),
    [selectedSession]
  );

  const sessionGraph = useMemo(() => {
    if (!selectedSession || !analytics) return null;
    const dupPaths = new Set(analytics.duplicateFileReads.map((d) => d.path));
    return buildSessionGraph(selectedSession, dupPaths);
  }, [selectedSession, analytics]);

  useEffect(() => {
    setSelectedStepId(selectedSession?.steps[0]?.id ?? null);
  }, [selectedSession?.id]);

  const selectedStep = useMemo(() => {
    if (!selectedSession || !selectedStepId) return null;
    return selectedSession.steps.find((s) => s.id === selectedStepId) ?? null;
  }, [selectedSession, selectedStepId]);

  const selectStep = (stepId: string) => {
    setSelectedStepId(stepId);
    setIsInspectorOpen(true);
  };

  const filteredSteps = useMemo(() => {
    if (!selectedSession) return [];
    if (stepFilter === "all") return selectedSession.steps;
    if (stepFilter === "errors") {
      return selectedSession.steps.filter((step) =>
        step.toolCalls.some((tool) => tool.status === "error")
      );
    }
    return selectedSession.steps.filter((step) => step.role === stepFilter);
  }, [selectedSession, stepFilter]);

  const toggleToolExpand = (toolId: string) => {
    setExpandedToolIds((prev) => ({ ...prev, [toolId]: !prev[toolId] }));
  };

  const handleImportSessions = (incoming: NormalizedSession[]) => {
    if (incoming.length === 0) return;
    setUploadError(null);
    const incomingIds = new Set(incoming.map((s) => s.id));
    const nextUploaded = [...incoming, ...uploadedSessions.filter((s) => !incomingIds.has(s.id))];
    setUploadedSessions(nextUploaded);
    const saved = saveUploadedSessions(nextUploaded);
    if (!saved) {
      setUploadError("Session(s) loaded, but browser storage quota is full so some will not persist after reload.");
    }
    setSelectedId(incoming[0].id);
    setStepFilter("all");
  };

  const handleImportSession = (session: NormalizedSession) => {
    handleImportSessions([session]);
  };

  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    if (!/\.(jsonl|json|txt)$/i.test(file.name)) {
      setUploadError("Unsupported file type. Please upload a .jsonl, .json, or .txt session log.");
      return;
    }
    try {
      const text = await file.text();
      const parsed = parseJsonlSession(text, file.name);
      if (parsed.steps.length === 0) {
        setUploadError("No valid AI session records found in this file.");
        return;
      }
      handleImportSession(parsed);
    } catch {
      setUploadError("Failed to read the uploaded file.");
    }
  };

  const handleDeleteSession = (id: string) => {
    const isUploaded = uploadedSessions.some((s) => s.id === id);
    let nextSessions: NormalizedSession[];

    if (isUploaded) {
      const nextUploaded = uploadedSessions.filter((s) => s.id !== id);
      setUploadedSessions(nextUploaded);
      saveUploadedSessions(nextUploaded);
      const activeDemos = DEMO_SESSIONS.filter((d) => !dismissedDemoIds.includes(d.id));
      nextSessions = [...nextUploaded, ...activeDemos];
    } else {
      const nextDismissed = Array.from(new Set([...dismissedDemoIds, id]));
      setDismissedDemoIds(nextDismissed);
      saveDismissedDemos(nextDismissed);
      const activeDemos = DEMO_SESSIONS.filter((d) => !nextDismissed.includes(d.id));
      nextSessions = [...uploadedSessions, ...activeDemos];
    }

    if (selectedId === id) {
      setSelectedId(nextSessions[0]?.id ?? "");
      setStepFilter("all");
    }
  };

  const handleRestoreDemos = () => {
    setDismissedDemoIds([]);
    saveDismissedDemos([]);
    if (!selectedId) {
      setSelectedId(DEMO_SESSIONS[0]?.id ?? "");
    }
  };

  return {
    sessions,
    selectedSession,
    selectedId: selectedSession?.id ?? "",
    setSelectedId,
    activeTab,
    setActiveTab,
    selectedStepId,
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
    handleImportSession,
    handleImportSessions,
    handleDeleteSession,
    handleRestoreDemos,
    hasDismissedDemos: dismissedDemoIds.length > 0,
    uploadError,
  };
}
