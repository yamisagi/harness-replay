"use client";

import { useEffect, useState } from "react";
import type { LocalPresetDir, ScannedSessionMeta } from "@/src/lib/server/localSessionScanner";
import { loadScannerState, saveScannerState } from "@/src/lib/storage/scannerStorage";
import { NormalizedSession } from "@/src/types/session";

export function useLocalSessions(onImportSessions: (sessions: NormalizedSession[]) => void) {
  const [presets, setPresets] = useState<LocalPresetDir[]>([]);
  const [selectedDirs, setSelectedDirs] = useState<string[]>([]);
  const [customDirs, setCustomDirs] = useState<string[]>([]);
  const [scanned, setScanned] = useState<ScannedSessionMeta[]>([]);
  const [checkedPaths, setCheckedPaths] = useState<string[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoadingBatch, setIsLoadingBatch] = useState(false);
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function init() {
      await Promise.resolve();
      if (!active) return;

      const stored = loadScannerState();
      if (stored) {
        setSelectedDirs(stored.selectedDirs);
        setCustomDirs(stored.customDirs);
        setScanned(stored.scanned);
        setHasScanned(stored.scanned.length > 0);
      }
      setIsHydrated(true);

      try {
        const res = await fetch("/api/sessions");
        const data = res.ok ? ((await res.json()) as { presets?: LocalPresetDir[] }) : null;
        if (!active || !data?.presets) return;
        setPresets(data.presets);
        if (!stored) {
          setSelectedDirs(data.presets.filter((p) => p.exists).map((p) => p.path));
        }
      } catch {
        // Ignore preset fetch errors when offline/static
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    saveScannerState({ selectedDirs, customDirs, scanned });
  }, [isHydrated, selectedDirs, customDirs, scanned]);

  const toggleDir = (dirPath: string) => {
    setSelectedDirs((prev) =>
      prev.includes(dirPath) ? prev.filter((p) => p !== dirPath) : [...prev, dirPath]
    );
  };

  const addCustomDir = (dirPath: string) => {
    const trimmed = dirPath.trim();
    if (!trimmed) return;
    if (!customDirs.includes(trimmed) && !presets.some((p) => p.path === trimmed)) {
      setCustomDirs((prev) => [...prev, trimmed]);
    }
    setSelectedDirs((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
  };

  const removeCustomDir = (dirPath: string) => {
    setCustomDirs((prev) => prev.filter((p) => p !== dirPath));
    setSelectedDirs((prev) => prev.filter((p) => p !== dirPath));
  };

  const scan = async () => {
    if (selectedDirs.length === 0) {
      setError("Select or add at least one directory.");
      return;
    }
    setIsScanning(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ directories: selectedDirs }),
      });
      const data = (await res.json()) as { sessions?: ScannedSessionMeta[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Scan failed.");
        return;
      }
      const found = data.sessions ?? [];
      setScanned(found);
      setCheckedPaths([]);
      setHasScanned(true);
    } catch {
      setError("Could not reach local scanner API.");
    } finally {
      setIsScanning(false);
    }
  };

  const toggleChecked = (filePath: string) => {
    setCheckedPaths((prev) =>
      prev.includes(filePath) ? prev.filter((p) => p !== filePath) : [...prev, filePath]
    );
  };

  const toggleSelectAll = () => {
    if (checkedPaths.length === scanned.length) {
      setCheckedPaths([]);
    } else {
      setCheckedPaths(scanned.map((s) => s.filePath));
    }
  };

  const clearScanned = () => {
    setScanned([]);
    setCheckedPaths([]);
    setHasScanned(false);
    setError(null);
  };

  const readSessionFromApi = async (filePath: string): Promise<NormalizedSession> => {
    const res = await fetch("/api/sessions/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filePath, allowedRoots: selectedDirs }),
    });
    const data = (await res.json()) as { session?: NormalizedSession; error?: string };
    if (!res.ok || !data.session) {
      throw new Error(data.error ?? "Failed to load session.");
    }
    return data.session;
  };

  const loadSession = async (filePath: string) => {
    setLoadingPath(filePath);
    setError(null);
    try {
      const session = await readSessionFromApi(filePath);
      onImportSessions([session]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read local session.");
    } finally {
      setLoadingPath(null);
    }
  };

  const loadSelectedSessions = async () => {
    if (checkedPaths.length === 0) return;
    setIsLoadingBatch(true);
    setError(null);
    const results = await Promise.allSettled(checkedPaths.map(readSessionFromApi));
    const loaded: NormalizedSession[] = [];
    let failedCount = 0;

    for (const r of results) {
      if (r.status === "fulfilled") loaded.push(r.value);
      else failedCount += 1;
    }

    if (loaded.length > 0) {
      onImportSessions(loaded);
      setCheckedPaths([]);
    }
    if (failedCount > 0) {
      setError(`${failedCount} selected file(s) could not be loaded (outside selected directories or invalid).`);
    }
    setIsLoadingBatch(false);
  };

  return {
    presets,
    customDirs,
    selectedDirs,
    scanned,
    checkedPaths,
    hasScanned,
    isScanning,
    isLoadingBatch,
    loadingPath,
    error,
    toggleDir,
    addCustomDir,
    removeCustomDir,
    scan,
    toggleChecked,
    toggleSelectAll,
    clearScanned,
    loadSession,
    loadSelectedSessions,
  };
}
