import { NextRequest, NextResponse } from "next/server";
import {
  getDefaultPresetDirs,
  isLocalScannerRequest,
  scanDirectoriesForSessions,
} from "@/src/lib/server/localSessionScanner";

const HOSTED_DISABLED_RESPONSE = NextResponse.json(
  { error: "Local scanner is disabled in hosted deployments." },
  { status: 403 }
);

export async function GET(request: NextRequest) {
  if (!isLocalScannerRequest(request.headers.get("host"))) {
    return HOSTED_DISABLED_RESPONSE;
  }
  try {
    const presets = await getDefaultPresetDirs();
    return NextResponse.json({ presets });
  } catch {
    return NextResponse.json({ error: "Failed to inspect preset directories." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isLocalScannerRequest(request.headers.get("host"))) {
    return HOSTED_DISABLED_RESPONSE;
  }
  try {
    const body = (await request.json()) as { directories?: unknown };
    if (!Array.isArray(body.directories)) {
      return NextResponse.json({ error: "directories must be an array of paths." }, { status: 400 });
    }

    const directories = body.directories
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .slice(0, 20);

    if (directories.length === 0) {
      return NextResponse.json({ error: "Select at least one directory to scan." }, { status: 400 });
    }

    const sessions = await scanDirectoriesForSessions(directories);
    return NextResponse.json({ sessions });
  } catch {
    return NextResponse.json({ error: "Failed to scan local directories." }, { status: 500 });
  }
}
