/* ============================================================================
   Client → server bridge for the Playwright runner.
   ----------------------------------------------------------------------------
   The browser tab POSTs the snippet to the dev-only /__tdd/run endpoint, which
   runs it in a real Chromium and returns the same RunOutcome shape the in-page
   runner produces — so the Results panel renders both identically.
   ========================================================================== */

import type { RunOutcome } from "./testRunner";

/** A cookie to seed into the isolated Playwright browser context for a run. */
export interface RequestCookie {
  name: string;
  value: string;
}

/** A header to apply to each Playwright document navigation request. */
export interface RequestHeader {
  name: string;
  value: string;
}

export const BRIDGE_ENDPOINT = "/__tdd/run";
export const SCREENSHOT_ENDPOINT = "/__tdd/screenshot";

/** Client-side ceiling: abort a run/capture that the server never finishes so
 *  the UI spinner can't hang indefinitely. Comfortably above the server's own
 *  launch + nav + test timeouts. */
const BRIDGE_CLIENT_TIMEOUT_MS = 60_000;

/** fetch() with a wall-clock abort. Returns the Response or throws AbortError. */
async function fetchWithTimeout(
  endpoint: string,
  body: unknown,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

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
  testIdAttribute?: string,
  recordVideo?: boolean,
  cookies?: RequestCookie[],
  headers?: RequestHeader[]
): Promise<RunOutcome> {
  let res: Response;
  try {
    res = await fetchWithTimeout(
      BRIDGE_ENDPOINT,
      { code, url, testIdAttribute, recordVideo, cookies, headers },
      BRIDGE_CLIENT_TIMEOUT_MS
    );
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return errorOutcome(
        `The Playwright bridge did not respond within ${BRIDGE_CLIENT_TIMEOUT_MS / 1000}s and the run was aborted. The dev server may be busy or the page never loaded.`
      );
    }
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
    res = await fetchWithTimeout(
      SCREENSHOT_ENDPOINT,
      { targetUrl, referenceUrl },
      BRIDGE_CLIENT_TIMEOUT_MS
    );
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(
        `The screenshot bridge did not respond within ${BRIDGE_CLIENT_TIMEOUT_MS / 1000}s and the capture was aborted.`
      );
    }
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
