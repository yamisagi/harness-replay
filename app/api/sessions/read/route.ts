import { NextRequest, NextResponse } from "next/server";
import { readLocalSessionFile } from "@/src/lib/server/localSessionScanner";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      filePath?: unknown;
      allowedRoots?: unknown;
    };

    if (typeof body.filePath !== "string" || body.filePath.trim().length === 0) {
      return NextResponse.json({ error: "filePath is required." }, { status: 400 });
    }

    const allowedRoots = Array.isArray(body.allowedRoots)
      ? body.allowedRoots.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [];

    if (allowedRoots.length === 0) {
      return NextResponse.json({ error: "allowedRoots is required." }, { status: 400 });
    }

    const session = await readLocalSessionFile(body.filePath, allowedRoots);
    return NextResponse.json({ session });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to read local session file.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
