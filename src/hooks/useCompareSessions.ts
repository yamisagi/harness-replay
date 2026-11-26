"use client";

import { useMemo, useState } from "react";
import { analyzeSession } from "@/src/lib/analytics/sessionAnalytics";
import {
  compareSessions,
  extractSessionProject,
  isSameTaskSession,
} from "@/src/lib/analytics/sessionCompare";
import { NormalizedSession, SessionAnalytics } from "@/src/types/session";

export function useCompareSessions(
  sessions: NormalizedSession[],
  selectedSession: NormalizedSession | null,
  selectedAnalytics: SessionAnalytics | null,
  onSelectSession: (id: string) => void
) {
  const [compareTargetId, setCompareTargetId] = useState<string>("");

  const { sameTaskCandidates, sameProjectCandidates, otherCandidates, compareCandidates } =
    useMemo(() => {
      const filtered = selectedSession
        ? sessions.filter((s) => s.id !== selectedSession.id)
        : sessions;
      if (!selectedSession) {
        return {
          sameTaskCandidates: [],
          sameProjectCandidates: [],
          otherCandidates: filtered,
          compareCandidates: filtered,
        };
      }
      const leftProject = extractSessionProject(selectedSession)?.toLowerCase() ?? null;
      const sameTask: NormalizedSession[] = [];
      const sameProject: NormalizedSession[] = [];
      const other: NormalizedSession[] = [];

      for (const candidate of filtered) {
        if (isSameTaskSession(selectedSession, candidate)) {
          sameTask.push(candidate);
        } else {
          const candProject = extractSessionProject(candidate)?.toLowerCase() ?? null;
          if (leftProject && candProject && leftProject === candProject) {
            sameProject.push(candidate);
          } else {
            other.push(candidate);
          }
        }
      }
      return {
        sameTaskCandidates: sameTask,
        sameProjectCandidates: sameProject,
        otherCandidates: other,
        compareCandidates: [...sameTask, ...sameProject, ...other],
      };
    }, [sessions, selectedSession]);

  const resolvedCompareSession = useMemo(() => {
    if (compareCandidates.length === 0) return null;
    if (compareTargetId) {
      const explicit = compareCandidates.find((s) => s.id === compareTargetId);
      if (explicit) return explicit;
    }
    return sameTaskCandidates[0] ?? sameProjectCandidates[0] ?? compareCandidates[0];
  }, [compareCandidates, sameTaskCandidates, sameProjectCandidates, compareTargetId]);

  const compareAnalytics = useMemo(
    () => (resolvedCompareSession ? analyzeSession(resolvedCompareSession) : null),
    [resolvedCompareSession]
  );

  const comparison = useMemo(() => {
    if (!selectedSession || !resolvedCompareSession || !selectedAnalytics || !compareAnalytics) {
      return null;
    }
    return compareSessions(selectedSession, resolvedCompareSession, selectedAnalytics, compareAnalytics);
  }, [selectedSession, resolvedCompareSession, selectedAnalytics, compareAnalytics]);

  const swapCompareSessions = () => {
    if (!selectedSession || !resolvedCompareSession) return;
    const prevLeftId = selectedSession.id;
    onSelectSession(resolvedCompareSession.id);
    setCompareTargetId(prevLeftId);
  };

  return {
    compareTargetId: resolvedCompareSession?.id ?? "",
    setCompareTargetId,
    compareSession: resolvedCompareSession,
    compareAnalytics,
    sameTaskCandidates,
    sameProjectCandidates,
    otherCandidates,
    comparison,
    swapCompareSessions,
  };
}
