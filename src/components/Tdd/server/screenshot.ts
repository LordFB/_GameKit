/* ============================================================================
   POST /__tdd/screenshot  — dev-only visual screenshot handler
   ----------------------------------------------------------------------------
   The App Router route at `app/__tdd/screenshot/route.ts` re-exports
   { POST, GET } from here so the logic travels with the component folder.
   ========================================================================== */

import { NextResponse } from "next/server";

const IS_DEV = process.env.NODE_ENV === "development";

function resolveLocalUrl(value: unknown, origin: string): string {
  if (typeof value !== "string" || !value.trim()) return origin + "/";
  const resolved = new URL(value, origin);
  if (resolved.origin !== origin) {
    throw new Error("Local target must resolve to this dev server origin.");
  }
  return resolved.href;
}

function resolveReferenceUrl(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Missing `referenceUrl`.");
  }
  const resolved = new URL(value);
  if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
    throw new Error("Reference URL must start with http:// or https://.");
  }
  return resolved.href;
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!IS_DEV) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { targetUrl?: unknown; referenceUrl?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const origin = new URL(request.url).origin;
    const targetUrl = resolveLocalUrl(body.targetUrl, origin);
    const referenceUrl = resolveReferenceUrl(body.referenceUrl);
    const { captureScreenshotPair } = await import("../screenshotRunner.server");
    const result = await captureScreenshotPair({ targetUrl, referenceUrl });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 }
    );
  }
}

export function GET(): NextResponse {
  if (!IS_DEV) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    ok: true,
    usage: "POST { targetUrl?: string, referenceUrl: string } to capture screenshots for visual diffing.",
  });
}
