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

// Hard wall-clock cap so a hung snippet (e.g. goto() to a never-loading route)
// can't hold a browser open forever. Sits above the runner's own 15s launch +
// 15s test timeouts.
const RUN_DEADLINE_MS = 45_000;

// Single-flight lock: each run launches a fresh Chromium, so concurrent runs
// (double-click, ⌘↵ + button, "Run all" overlap) would spawn parallel browsers
// and thrash the dev machine. Serialize them instead — a second request waits
// for the first, and if the queue is already backed up it is rejected fast.
let inFlight: Promise<unknown> = Promise.resolve();
let queued = 0;
const MAX_QUEUE = 1;

function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(message)), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}

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

  // Reject quickly if a run is already queued behind the in-flight one, instead
  // of letting clicks pile up into a long serial backlog.
  if (queued >= MAX_QUEUE) {
    return NextResponse.json(
      { error: "A Playwright run is already in progress. Wait for it to finish before starting another." },
      { status: 429 }
    );
  }

  // Import the runner lazily so the module (and Playwright) is only resolved
  // when the dev actually invokes the bridge.
  const { runViaPlaywright } = await import("@/components/Tdd/playwrightRunner.server");

  const testIdAttribute =
    typeof body.testIdAttribute === "string" ? body.testIdAttribute : undefined;

  // Chain onto the in-flight run so only one Chromium is alive at a time.
  queued += 1;
  const run = inFlight
    .catch(() => {})
    .then(() =>
      withTimeout(
        runViaPlaywright(code, { baseUrl: origin, startUrl, testIdAttribute }),
        RUN_DEADLINE_MS,
        `Playwright run exceeded ${RUN_DEADLINE_MS / 1000}s and was aborted.`
      )
    );
  inFlight = run;

  try {
    const outcome: RunOutcome = await run;
    return NextResponse.json(outcome);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  } finally {
    queued -= 1;
  }
}

export function GET(): NextResponse {
  if (!IS_DEV) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    ok: true,
    usage: "POST { code, url? } to run a Playwright snippet against the dev server.",
  });
}
