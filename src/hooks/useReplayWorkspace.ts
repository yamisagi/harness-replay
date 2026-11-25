"use client";

import { useEffect, useMemo, useState } from "react";
import { DEMO_SESSIONS } from "@/src/data/mockSessions";
import { analyzeSession } from "@/src/lib/analytics/sessionAnalytics";
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
      const nextUploaded = [parsed, ...uploadedSessions];
      setUploadedSessions(nextUploaded);
      const saved = saveUploadedSessions(nextUploaded);
      if (!saved) {
        setUploadError("Session loaded, but browser storage quota is full so it will not persist after reload.");
      }
      setSelectedId(parsed.id);
      setStepFilter("all");
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
    stepFilter,
    setStepFilter,
    filteredSteps,
    analytics,
    expandedToolIds,
    toggleToolExpand,
    handleFileUpload,
    handleDeleteSession,
    handleRestoreDemos,
    hasDismissedDemos: dismissedDemoIds.length > 0,
    uploadError,
  };
}
