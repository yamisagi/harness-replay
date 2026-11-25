import { NextRequest, NextResponse } from "next/server";
import {
  getDefaultPresetDirs,
  scanDirectoriesForSessions,
} from "@/src/lib/server/localSessionScanner";

export async function GET() {
  try {
    const presets = await getDefaultPresetDirs();
    return NextResponse.json({ presets });
  } catch {
    return NextResponse.json({ error: "Failed to inspect preset directories." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
