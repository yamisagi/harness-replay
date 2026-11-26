"use client";

import { useEffect, useMemo, useState } from "react";
import { SwarmTab } from "@/src/components/SwarmHeader";
import { DEMO_SESSIONS } from "@/src/data/mockSessions";
import { analyzeSession } from "@/src/lib/analytics/sessionAnalytics";
import { buildSessionGraph } from "@/src/lib/analytics/sessionGraph";
import { parseJsonlSession } from "@/src/lib/parsers/jsonlParser";
import {
  loadPersistedSessions,
  loadStoredMeta,
  persistImportedSessions,
  removePersistedSession,
  saveCustomTitles,
  saveDismissedDemos,
} from "@/src/lib/storage/sessionStorage";
import { NormalizedSession, StepRole } from "@/src/types/session";
import { useCompareSessions } from "./useCompareSessions";

export type StepFilter = "all" | StepRole | "errors";

export function useReplayWorkspace() {
  const [uploadedSessions, setUploadedSessions] = useState<NormalizedSession[]>([]);
  const [dismissedDemoIds, setDismissedDemoIds] = useState<string[]>([]);
  const [customTitles, setCustomTitles] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string>(DEMO_SESSIONS[0].id);
  const [activeTab, setActiveTab] = useState<SwarmTab>("overview");
  const [selectedStepId, setSelectedStepId] = useState<string | null>(
    DEMO_SESSIONS[0].steps[0]?.id ?? null
  );
  const [selectedStepSessionId, setSelectedStepSessionId] = useState<string | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [stepFilter, setStepFilter] = useState<StepFilter>("all");
  const [expandedToolIds, setExpandedToolIds] = useState<Record<string, boolean>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    async function hydrate() {
      try {
        const meta = loadStoredMeta();
        const persisted = await loadPersistedSessions();
        if (!active) return;
        setUploadedSessions(persisted);
        setDismissedDemoIds(meta.dismissedDemoIds);
        setCustomTitles(meta.customTitles);
        if (persisted.length > 0) {
          setSelectedId(persisted[0].id);
        } else {
          const firstDemo = DEMO_SESSIONS.find((d) => !meta.dismissedDemoIds.includes(d.id));
          setSelectedId(firstDemo?.id ?? "");
        }
      } finally {
        if (active) setIsHydrated(true);
      }
    }
    void hydrate();
    return () => {
      active = false;
    };
  }, []);

  const sessions = useMemo(() => {
    if (!isHydrated) return [];
    const activeDemos = DEMO_SESSIONS.filter((d) => !dismissedDemoIds.includes(d.id));
    return [...uploadedSessions, ...activeDemos].map((s) =>
      customTitles[s.id] ? { ...s, title: customTitles[s.id] } : s
    );
  }, [isHydrated, uploadedSessions, dismissedDemoIds, customTitles]);

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

  const selectSession = (id: string) => {
    setSelectedId(id);
    setSelectedStepId(null);
    setSelectedStepSessionId(null);
  };

  const compare = useCompareSessions(sessions, selectedSession, analytics, selectSession);

  const activeStepSessionId = selectedStepSessionId ?? selectedSession?.id ?? null;

  const activeStepId = useMemo(() => {
    if (!selectedSession) return null;
    const targetSession =
      activeStepSessionId === compare.compareSession?.id ? compare.compareSession : selectedSession;
    if (selectedStepId && targetSession?.steps.some((s) => s.id === selectedStepId)) {
      return selectedStepId;
    }
    return selectedSession.steps[0]?.id ?? null;
  }, [selectedSession, compare.compareSession, activeStepSessionId, selectedStepId]);

  const selectedStep = useMemo(() => {
    if (!selectedSession || !activeStepId) return null;
    const targetSession =
      activeStepSessionId === compare.compareSession?.id ? compare.compareSession : selectedSession;
    return targetSession?.steps.find((s) => s.id === activeStepId) ?? null;
  }, [selectedSession, compare.compareSession, activeStepSessionId, activeStepId]);

  const selectStep = (stepId: string, sessionId?: string) => {
    setSelectedStepId(stepId);
    setSelectedStepSessionId(sessionId ?? selectedSession?.id ?? null);
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
    const deduped: NormalizedSession[] = [];
    const incomingIds = new Set<string>();
    for (const s of incoming) {
      if (incomingIds.has(s.id)) continue;
      incomingIds.add(s.id);
      deduped.push(s);
    }
    setUploadedSessions((prev) => [...deduped, ...prev.filter((s) => !incomingIds.has(s.id))]);
    void persistImportedSessions(deduped).then((saved) => {
      if (!saved) {
        setUploadError("Session(s) loaded, but IndexedDB persistence failed.");
      }
    });
    setSelectedId(deduped[0].id);
    setSelectedStepId(null);
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
      void removePersistedSession(id);
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

  const handleRenameSession = (id: string, nextTitle: string) => {
    const trimmed = nextTitle.trim();
    if (!trimmed) return;
    const next = { ...customTitles, [id]: trimmed };
    setCustomTitles(next);
    saveCustomTitles(next);
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
    setSelectedId: selectSession,
    activeTab,
    setActiveTab,
    selectedStepId: activeStepId,
    selectedStepSessionId: activeStepSessionId,
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
    handleRenameSession,
    handleRestoreDemos,
    hasDismissedDemos: dismissedDemoIds.length > 0,
    isHydrated,
    uploadError,
    compare,
  };
}
