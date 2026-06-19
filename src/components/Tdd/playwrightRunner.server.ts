/* ============================================================================
   Playwright bridge — the Node-side runner (concept §2 "Real automation tests")
   ----------------------------------------------------------------------------
   A browser tab cannot become Playwright by itself; it needs a Node process.
   This module IS that process. It launches a real Chromium, navigates to the
   page, and executes a snippet against a Playwright-flavored API (`page`,
   `expect`, `test`). The `.server` suffix + the fact that it is imported only
   from the Node API route keep it off the client; the route is dev-guarded.

   The snippet API mirrors the concept's example shape:
     await page.goto("/dashboard")
     await page.getByRole("button", { name: "Save" }).click()
     await expect(page.getByText("Saved")).toBeVisible()
   ========================================================================== */

import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type {
  AssertionResult,
  RunOutcome,
  ScreenshotAttachment,
  VideoAttachment,
} from "./testRunner";

// Playwright is a devDependency; import lazily so a production build that never
// calls this never has to resolve it. `expect` comes from @playwright/test
// (the web-first assertion library); the browser launcher from core playwright.
type PwModule = typeof import("playwright");
type PwTestModule = typeof import("@playwright/test");

const LAUNCH_TIMEOUT_MS = 15_000;
const TEST_TIMEOUT_MS = 15_000;

function formatError(err: unknown): string {
  if (err instanceof Error) {
    // Playwright errors carry a useful first line; trim the deep internal stack.
    const head = err.message.split("\n").slice(0, 8).join("\n");
    return `${err.name}: ${head}`;
  }
  return String(err);
}

interface RegisteredTest {
  name: string;
  fn: () => Promise<void> | void;
}

function dataUrl(buffer: Buffer): string {
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

function screenshotName(options: unknown, index: number): { name: string; path?: string } {
  if (options && typeof options === "object" && "path" in options) {
    const path = String((options as { path?: unknown }).path ?? "");
    const parts = path.split(/[\\/]/);
    return { name: parts.at(-1) || `screenshot-${index}.png`, path };
  }
  return { name: `screenshot-${index}.png` };
}

export interface BridgeOptions {
  /** Absolute URL the snippet's relative goto()s resolve against. */
  baseUrl: string;
  /** Initial page to open before the snippet runs. */
  startUrl: string;
  /** Attribute used by page.getByTestId / screen.getByTestId. */
  testIdAttribute?: string;
  /** Record the whole session to a video and attach it to the outcome. */
  recordVideo?: boolean;
}

/** Cap the embedded video so a long run can't blow up the JSON response. */
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

function normalizeTestIdAttribute(value?: string): string {
  const attr = value?.trim() || "data-test";
  return /^[A-Za-z_][A-Za-z0-9_.:-]*$/.test(attr) ? attr : "data-test";
}

function escapeAttrValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export async function runViaPlaywright(
  code: string,
  options: BridgeOptions
): Promise<RunOutcome> {
  const ranAt = Date.now();
  const started = Date.now();

  let pw: PwModule;
  let pwTest: PwTestModule;
  try {
    pw = (await import("playwright")) as PwModule;
    pwTest = (await import("@playwright/test")) as PwTestModule;
  } catch {
    return failOutcome(
      ranAt,
      "Playwright is not installed. Run `npm i -D playwright @playwright/test && npx playwright install chromium`."
    );
  }

  let browser: Awaited<ReturnType<PwModule["chromium"]["launch"]>> | null = null;
  try {
    browser = await pw.chromium.launch({ timeout: LAUNCH_TIMEOUT_MS });
  } catch (err) {
    return failOutcome(
      ranAt,
      `Could not launch Chromium: ${formatError(err)}\nTry: npx playwright install chromium`
    );
  }

  const results: AssertionResult[] = [];
  // Playwright only flushes the video file once the context closes, so we keep a
  // temp dir alive for the whole run and read+embed (then delete) it at the end.
  let videoDir: string | null = null;
  if (options.recordVideo) {
    try {
      videoDir = await fs.mkdtemp(path.join(os.tmpdir(), "tdd-video-"));
    } catch {
      /* recording is best-effort; carry on without it */
    }
  }
  let video: VideoAttachment | undefined;

  try {
    const context = await browser.newContext({
      baseURL: options.baseUrl,
      ...(videoDir ? { recordVideo: { dir: videoDir } } : {}),
    });
    const page = await context.newPage();

    // Close the context (which flushes any recording) and embed the resulting
    // video. Safe to call once; both exit paths route through here so a compile
    // error still yields whatever was recorded up to that point.
    const closeAndCaptureVideo = async () => {
      const recording = page.video();
      await context.close();
      if (!videoDir || !recording) return;
      try {
        const file = await recording.path();
        const stat = await fs.stat(file);
        if (stat.size > 0 && stat.size <= MAX_VIDEO_BYTES) {
          const buffer = await fs.readFile(file);
          video = {
            id: `video_${Date.now().toString(36)}`,
            name: "session.webm",
            dataUrl: `data:video/webm;base64,${buffer.toString("base64")}`,
            sizeBytes: stat.size,
            takenAt: Date.now(),
          };
        }
      } catch {
        /* recording is best-effort; a missing/oversized file just omits it */
      }
    };

    const testIdAttribute = normalizeTestIdAttribute(options.testIdAttribute);
    const getByConfiguredTestId = (id: string) =>
      page.locator(`[${testIdAttribute}="${escapeAttrValue(id)}"]`);
    page.getByTestId = getByConfiguredTestId as typeof page.getByTestId;

    const logs: string[] = [];
    page.on("console", (m) => logs.push(`${m.type()}: ${m.text()}`));
    page.on("pageerror", (e) => logs.push(`pageerror: ${e.message}`));

    const setupGoto = () =>
      page.goto(options.startUrl, { waitUntil: "domcontentloaded", timeout: TEST_TIMEOUT_MS });

    // The setup navigation to startUrl is scaffolding, not part of the test. When
    // recording, skip it for snippets that navigate themselves (the common case:
    // the first line is `page.goto(...)`) so the video starts at the snippet's own
    // first navigation rather than this boilerplate goto. Snippets that never
    // navigate have nothing of their own to record, so we still load startUrl up
    // front — that nav is then the legitimate first frame.
    const snippetNavigates = /\bpage\s*\.\s*goto\s*\(/.test(code);
    if (!videoDir || !snippetNavigates) {
      await setupGoto();
    }

    const registered: RegisteredTest[] = [];
    const test = (name: string, fn: () => Promise<void> | void) => {
      registered.push({ name, fn });
    };
    let screenshotSink: ScreenshotAttachment[] = [];
    let screenshotCount = 0;
    const originalScreenshot = page.screenshot.bind(page);
    page.screenshot = (async (options?: Parameters<typeof page.screenshot>[0]) => {
      const buffer = await originalScreenshot(options);
      screenshotCount += 1;
      const label = screenshotName(options, screenshotCount);
      screenshotSink.push({
        id: `shot_${Date.now().toString(36)}_${screenshotCount}`,
        ...label,
        dataUrl: dataUrl(buffer),
        width: page.viewportSize()?.width ?? 0,
        height: page.viewportSize()?.height ?? 0,
        takenAt: Date.now(),
      });
      return buffer;
    }) as typeof page.screenshot;

    // Assertions started by the testing-library-style matchers below are tracked
    // here so a NON-awaited assertion (the in-page sync style: `expect(el).
    // toBeInTheDocument()`) still fails its test. After each test's fn() resolves
    // we await everything in this list (see drainPending); without it a failing
    // un-awaited assertion would be a silent false positive.
    let pending: Array<Promise<void>> = [];

    // Wrap a Playwright assertion so it (a) returns a promise the snippet may
    // await, and (b) is tracked for the post-test drain whether or not it does.
    const trackedMatcher =
      <Args extends unknown[]>(
        run: (locator: import("playwright").Locator, ...args: Args) => Promise<void>,
        okMessage: (...args: Args) => string
      ) =>
      (locator: import("playwright").Locator, ...args: Args) => {
        const settled = run(locator, ...args).then(
          () => ({ pass: true as const, message: () => okMessage(...args) }),
          (e: unknown) => ({ pass: false as const, message: () => (e instanceof Error ? e.message : String(e)) })
        );
        // Surface a rejection to the post-test drain.
        pending.push(settled.then((r) => { if (!r.pass) throw new Error(r.message()); }));
        return settled;
      };

    // `expect` is delegated to Playwright's own assertion library so the snippet
    // gets the real toBeVisible/toHaveText/etc. against live locators. We extend
    // it with the testing-library matchers the in-page runner exposes
    // (toBeInTheDocument, toHaveTextContent) so the same snippets work in both
    // runners instead of throwing "toBeInTheDocument is not a function". They
    // map to Playwright's web-first equivalents and auto-wait/retry.
    const expect = pwTest.expect.extend({
      toBeInTheDocument: trackedMatcher(
        (locator) => pwTest.expect(locator).toBeAttached(),
        () => "element is in the document"
      ),
      toHaveTextContent: trackedMatcher(
        (locator, text: string | RegExp) => pwTest.expect(locator).toContainText(text),
        (text) => `element contains text ${text}`
      ),
    });

    // Await every assertion started since `pending` was reset, throwing the
    // first failure. Returns nothing on success.
    const drainPending = async () => {
      const batch = pending;
      pending = [];
      const settled = await Promise.allSettled(batch);
      const firstReject = settled.find((s) => s.status === "rejected");
      if (firstReject && firstReject.status === "rejected") {
        throw firstReject.reason instanceof Error ? firstReject.reason : new Error(String(firstReject.reason));
      }
    };

    // testing-library-style `screen`, mapped onto Playwright's page locators, so
    // legacy in-page snippets (`screen.getByRole(...)`) also work under this runner
    // instead of throwing "screen is not defined".
    const byRole = (role: string, options?: { name?: string | RegExp }) =>
      page.getByRole(role as Parameters<typeof page.getByRole>[0], options);
    // The getAllBy*/queryAllBy* family: in the in-page runner these return an
    // array; under Playwright a single Locator already represents "all matches",
    // so we return the Locator (use .count()/.all()/.nth(i) on it). This keeps
    // `screen.getAllByRole(...)` from throwing "is not a function".
    const screen = {
      getByRole: byRole,
      getByText: (text: string | RegExp) => page.getByText(text),
      getByTestId: getByConfiguredTestId,
      getByLabelText: (text: string | RegExp) => page.getByLabel(text),
      getByPlaceholderText: (text: string | RegExp) => page.getByPlaceholder(text),
      queryByText: (text: string | RegExp) => page.getByText(text),
      queryByRole: byRole,
      getAllByRole: byRole,
      queryAllByRole: byRole,
      getAllByText: (text: string | RegExp) => page.getByText(text),
      queryAllByText: (text: string | RegExp) => page.getByText(text),
      getAllByTestId: getByConfiguredTestId,
    };

    // Compile the snippet body. It may register tests or run bare awaited steps.
    let compiled: (...args: unknown[]) => Promise<unknown>;
    const api = { page, expect, screen, test, it: test, console: makeConsole(logs), context };
    try {
      const AsyncFn = Object.getPrototypeOf(async () => {}).constructor;
      compiled = new AsyncFn(...Object.keys(api), `"use strict";\n${code}`) as typeof compiled;
    } catch (err) {
      results.push({ name: "compile", status: "failed", durationMs: 0, error: formatError(err), logs: [] });
      await closeAndCaptureVideo();
      return finalize(results, ranAt, started, video);
    }

    let topLevelError: string | undefined;
    const beforeLen = logs.length;
    const bodyScreenshots: ScreenshotAttachment[] = [];
    screenshotSink = bodyScreenshots;
    pending = [];
    try {
      await compiled(...Object.values(api));
      // A bare snippet may have fired un-awaited assertions in its body.
      if (registered.length === 0) await drainPending();
    } catch (err) {
      topLevelError = formatError(err);
    }
    const bodyLogs = logs.slice(beforeLen);

    if (registered.length === 0) {
      results.push({
        name: "snippet",
        status: topLevelError ? "failed" : "passed",
        durationMs: Date.now() - started,
        error: topLevelError,
        logs: bodyLogs,
        screenshots: bodyScreenshots.slice(),
      });
    } else {
      if (topLevelError || bodyLogs.length > 0 || bodyScreenshots.length > 0) {
        results.push({
          name: "snippet body",
          status: topLevelError ? "failed" : "passed",
          durationMs: 0,
          error: topLevelError,
          logs: bodyLogs,
          screenshots: bodyScreenshots.slice(),
        });
      }
      for (const t of registered) {
        const at = logs.length;
        const tStart = Date.now();
        const caseScreenshots: ScreenshotAttachment[] = [];
        screenshotSink = caseScreenshots;
        pending = [];
        try {
          await withTimeout(Promise.resolve(t.fn()), TEST_TIMEOUT_MS, t.name);
          // Catch any un-awaited assertions the test body started.
          await drainPending();
          results.push({
            name: t.name,
            status: "passed",
            durationMs: Date.now() - tStart,
            logs: logs.slice(at),
            screenshots: caseScreenshots.slice(),
          });
        } catch (err) {
          results.push({
            name: t.name,
            status: "failed",
            durationMs: Date.now() - tStart,
            error: formatError(err),
            logs: logs.slice(at),
            screenshots: caseScreenshots.slice(),
          });
        }
      }
    }

    await closeAndCaptureVideo();
    return finalize(results, ranAt, started, video);
  } finally {
    await browser.close().catch(() => {});
    // Drop the temp recording now that it's embedded in the response.
    if (videoDir) await fs.rm(videoDir, { recursive: true, force: true }).catch(() => {});
  }
}

function makeConsole(sink: string[]) {
  const push = (prefix: string) => (...args: unknown[]) =>
    sink.push(prefix + args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "));
  return { log: push(""), info: push(""), warn: push("⚠ "), error: push("✖ ") };
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`test "${label}" timed out after ${ms}ms`)), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}

function finalize(
  results: AssertionResult[],
  ranAt: number,
  started: number,
  video?: VideoAttachment
): RunOutcome {
  const passed = results.filter((r) => r.status === "passed").length;
  return {
    results,
    total: results.length,
    passed,
    failed: results.length - passed,
    durationMs: Date.now() - started,
    ranAt,
    ...(video ? { video } : {}),
  };
}

function failOutcome(ranAt: number, message: string): RunOutcome {
  return {
    results: [{ name: "playwright bridge", status: "failed", durationMs: 0, error: message, logs: [] }],
    total: 1,
    passed: 0,
    failed: 1,
    durationMs: 0,
    ranAt,
  };
}
