/* ============================================================================
   POST /__tdd/run  — dev-only Playwright bridge endpoint
   ----------------------------------------------------------------------------
   Security boundary (concept §Security boundary): this executes arbitrary code
   in a Node-launched browser, so it is HARD-GUARDED to development. In any
   other NODE_ENV it 404s as if the route did not exist. Never enable in prod.
   ========================================================================== */

import { NextResponse } from "next/server";
import type { RunOutcome } from "@/components/Tdd/testRunner";

// Force the Node runtime (Playwright needs it) and never statically optimize.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IS_DEV = process.env.NODE_ENV === "development";

export async function POST(request: Request): Promise<NextResponse> {
  if (!IS_DEV) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { code?: unknown; url?: unknown; testIdAttribute?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code : "";
  if (!code.trim()) {
    return NextResponse.json({ error: "Missing `code`" }, { status: 400 });
  }

  // Resolve the page to drive: an explicit (same-origin) url, else the app root.
  const origin = new URL(request.url).origin;
  let startUrl = origin + "/";
  if (typeof body.url === "string" && body.url) {
    try {
      const resolved = new URL(body.url, origin);
      // Only allow same-origin targets — don't turn this into an SSRF tool.
      if (resolved.origin === origin) startUrl = resolved.href;
    } catch {
      /* keep default */
    }
  }

  // Import the runner lazily so the module (and Playwright) is only resolved
  // when the dev actually invokes the bridge.
  const { runViaPlaywright } = await import("@/components/Tdd/playwrightRunner.server");

  try {
    const outcome: RunOutcome = await runViaPlaywright(code, {
      baseUrl: origin,
      startUrl,
      testIdAttribute:
        typeof body.testIdAttribute === "string" ? body.testIdAttribute : undefined,
    });
    return NextResponse.json(outcome);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export function GET(): NextResponse {
  if (!IS_DEV) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    ok: true,
    usage: "POST { code, url? } to run a Playwright snippet against the dev server.",
  });
}
