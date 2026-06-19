/* ============================================================================
   Client → server bridge for the Playwright runner.
   ----------------------------------------------------------------------------
   The browser tab POSTs the snippet to the dev-only /__tdd/run endpoint, which
   runs it in a real Chromium and returns the same RunOutcome shape the in-page
   runner produces — so the Results panel renders both identically.
   ========================================================================== */

import type { RunOutcome } from "./testRunner";

export const BRIDGE_ENDPOINT = "/__tdd/run";
export const SCREENSHOT_ENDPOINT = "/__tdd/screenshot";

export interface ScreenshotPair {
  targetUrl: string;
  referenceUrl: string;
  targetPng: string;
  referencePng: string;
  width: number;
  height: number;
  durationMs: number;
  capturedAt: number;
}

function errorOutcome(message: string): RunOutcome {
  return {
    results: [{ name: "playwright bridge", status: "failed", durationMs: 0, error: message, logs: [] }],
    total: 1,
    passed: 0,
    failed: 1,
    durationMs: 0,
    ranAt: Date.now(),
  };
}

/** Run a snippet against the dev server via the Node Playwright bridge. */
export async function runViaBridge(
  code: string,
  url?: string,
  testIdAttribute?: string
): Promise<RunOutcome> {
  let res: Response;
  try {
    res = await fetch(BRIDGE_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code, url, testIdAttribute }),
    });
  } catch (err) {
    return errorOutcome(
      `Could not reach the Playwright bridge at ${BRIDGE_ENDPOINT}. Is the dev server running?\n${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  if (res.status === 404) {
    return errorOutcome(
      `${BRIDGE_ENDPOINT} is not available (404). The bridge only runs in development.`
    );
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return errorOutcome(`Bridge returned a non-JSON response (HTTP ${res.status}).`);
  }

  if (!res.ok || (data && typeof data === "object" && "error" in data)) {
    const message = data && typeof data === "object" && "error" in data
      ? String((data as { error: unknown }).error)
      : `Bridge failed with HTTP ${res.status}.`;
    return errorOutcome(message);
  }

  return data as RunOutcome;
}

export async function captureScreenshotPair(
  targetUrl: string,
  referenceUrl: string
): Promise<ScreenshotPair> {
  let res: Response;
  try {
    res = await fetch(SCREENSHOT_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetUrl, referenceUrl }),
    });
  } catch (err) {
    throw new Error(
      `Could not reach the screenshot bridge at ${SCREENSHOT_ENDPOINT}. Is the dev server running?\n${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Screenshot bridge returned a non-JSON response (HTTP ${res.status}).`);
  }

  if (!res.ok || (data && typeof data === "object" && "error" in data)) {
    throw new Error(
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : `Screenshot bridge failed with HTTP ${res.status}.`
    );
  }

  return data as ScreenshotPair;
}
