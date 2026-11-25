import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseJsonlSession } from "@/src/lib/parsers/jsonlParser";
import { HarnessType, NormalizedSession } from "@/src/types/session";

export interface LocalPresetDir {
  id: string;
  label: string;
  path: string;
  exists: boolean;
}

export interface ScannedSessionMeta {
  filePath: string;
  fileName: string;
  harness: HarnessType;
  title: string;
  stepCount: number;
  sizeBytes: number;
  modifiedAt: string;
}

const MAX_SCAN_DEPTH = 5;
const MAX_DISCOVERED_FILES = 1000;
const MAX_PARSED_SESSIONS = 100;
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const SKIP_DIRS = new Set(["node_modules", ".git", ".ssh", ".next", "chunks"]);

export function expandHomePath(inputPath: string): string {
  const trimmed = inputPath.trim();
  if (trimmed === "~") return os.homedir();
  if (trimmed.startsWith("~/") || trimmed.startsWith("~\\")) {
    return path.resolve(os.homedir(), trimmed.slice(2));
  }
  return path.resolve(trimmed);
}

export function isPathInsideRoots(targetPath: string, roots: string[]): boolean {
  const resolvedTarget = path.resolve(targetPath);
  return roots.some((root) => {
    const resolvedRoot = expandHomePath(root);
    const rel = path.relative(resolvedRoot, resolvedTarget);
    return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
  });
}

async function pathIsDirectory(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

export async function getDefaultPresetDirs(): Promise<LocalPresetDir[]> {
  const home = os.homedir();
  const candidates = [
    { id: "claude", label: "Claude Code", path: path.join(home, ".claude", "projects") },
    { id: "codex", label: "Codex CLI", path: path.join(home, ".codex", "sessions") },
    { id: "antigravity", label: "Antigravity", path: path.join(home, ".gemini", "antigravity", "brain") },
    { id: "opencode", label: "OpenCode", path: path.join(home, ".local", "share", "opencode") },
  ];

  return Promise.all(
    candidates.map(async (item) => ({
      ...item,
      exists: await pathIsDirectory(item.path),
    }))
  );
}

async function collectJsonlFiles(dirPath: string, depth: number, out: string[]): Promise<void> {
  if (depth > MAX_SCAN_DEPTH || out.length >= MAX_DISCOVERED_FILES) return;
  let entries;
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return;
  }

  const hasCompactTranscript = entries.some(
    (e) => e.isFile() && e.name.toLowerCase() === "transcript.jsonl"
  );

  for (const entry of entries) {
    if (out.length >= MAX_DISCOVERED_FILES) break;
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        await collectJsonlFiles(path.join(dirPath, entry.name), depth + 1, out);
      }
      continue;
    }
    const lowerName = entry.name.toLowerCase();
    if (entry.isFile() && lowerName.endsWith(".jsonl")) {
      if (hasCompactTranscript && lowerName === "transcript_full.jsonl") continue;
      out.push(path.join(dirPath, entry.name));
    }
  }
}

export async function scanDirectoriesForSessions(rawDirs: string[]): Promise<ScannedSessionMeta[]> {
  const resolvedDirs = Array.from(new Set(rawDirs.map(expandHomePath)));
  const filePaths: string[] = [];

  for (const dir of resolvedDirs) {
    if (await pathIsDirectory(dir)) {
      await collectJsonlFiles(dir, 0, filePaths);
    }
  }

  const withStats: Array<{ filePath: string; sizeBytes: number; mtimeMs: number; modifiedAt: string }> = [];
  for (const filePath of filePaths) {
    try {
      const stat = await fs.stat(filePath);
      if (!stat.isFile() || stat.size === 0 || stat.size > MAX_FILE_BYTES) continue;
      withStats.push({
        filePath,
        sizeBytes: stat.size,
        mtimeMs: stat.mtimeMs,
        modifiedAt: stat.mtime.toISOString(),
      });
    } catch {
      // Skip unreadable files
    }
  }

  withStats.sort((a, b) => b.mtimeMs - a.mtimeMs);

  const results: ScannedSessionMeta[] = [];
  for (const entry of withStats.slice(0, MAX_PARSED_SESSIONS)) {
    try {
      const content = await fs.readFile(entry.filePath, "utf8");
      const fileName = path.basename(entry.filePath);
      const parsed = parseJsonlSession(content, fileName);
      if (parsed.steps.length === 0) continue;

      results.push({
        filePath: entry.filePath,
        fileName,
        harness: parsed.harness,
        title: parsed.title,
        stepCount: parsed.steps.length,
        sizeBytes: entry.sizeBytes,
        modifiedAt: entry.modifiedAt,
      });
    } catch {
      // Skip unreadable or invalid files
    }
  }

  return results;
}

export async function readLocalSessionFile(
  filePath: string,
  allowedRoots: string[]
): Promise<NormalizedSession> {
  const resolved = expandHomePath(filePath);
  if (!resolved.toLowerCase().endsWith(".jsonl")) {
    throw new Error("Only .jsonl session files can be loaded.");
  }
  if (!isPathInsideRoots(resolved, allowedRoots)) {
    throw new Error("File path is outside the selected directories.");
  }

  const stat = await fs.stat(resolved);
  if (!stat.isFile() || stat.size > MAX_FILE_BYTES) {
    throw new Error("Invalid or oversized session file.");
  }

  const content = await fs.readFile(resolved, "utf8");
  const parsed = parseJsonlSession(content, path.basename(resolved));
  if (parsed.steps.length === 0) {
    throw new Error("No valid AI session records found in this file.");
  }

  const stableKey = Buffer.from(resolved).toString("base64url").slice(0, 24);
  return {
    ...parsed,
    id: `local-${stableKey}`,
  };
}
