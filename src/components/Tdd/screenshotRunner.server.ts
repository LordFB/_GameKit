/* ============================================================================
   Playwright screenshot bridge
   ----------------------------------------------------------------------------
   Dev-only helper used by the TDD Toolkit visual comparison panel. It captures
   two real Chromium screenshots and returns PNG data URLs; the client computes
   the pixel diff so we do not need native image-diff dependencies in Node.
   ========================================================================== */

type PwModule = typeof import("playwright");

const LAUNCH_TIMEOUT_MS = 15_000;
const NAV_TIMEOUT_MS = 20_000;
const VIEWPORT = { width: 1365, height: 768 };

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

function formatError(err: unknown): string {
  if (err instanceof Error) {
    const head = err.message.split("\n").slice(0, 6).join("\n");
    return `${err.name}: ${head}`;
  }
  return String(err);
}

function pngDataUrl(buffer: Buffer): string {
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

export async function captureScreenshotPair(options: {
  targetUrl: string;
  referenceUrl: string;
}): Promise<ScreenshotPair> {
  const started = Date.now();
  let pw: PwModule;
  try {
    pw = (await import("playwright")) as PwModule;
  } catch {
    throw new Error(
      "Playwright is not installed. Run `npm i -D playwright @playwright/test && npx playwright install chromium`."
    );
  }

  let browser: Awaited<ReturnType<PwModule["chromium"]["launch"]>> | null = null;
  try {
    browser = await pw.chromium.launch({ timeout: LAUNCH_TIMEOUT_MS });
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });

    const capture = async (url: string) => {
      const page = await context.newPage();
      await page.goto(url, { waitUntil: "networkidle", timeout: NAV_TIMEOUT_MS });
      const buffer = await page.screenshot({
        type: "png",
        fullPage: false,
        animations: "disabled",
      });
      await page.close();
      return pngDataUrl(buffer);
    };

    const [targetPng, referencePng] = await Promise.all([
      capture(options.targetUrl),
      capture(options.referenceUrl),
    ]);

    await context.close();
    return {
      targetUrl: options.targetUrl,
      referenceUrl: options.referenceUrl,
      targetPng,
      referencePng,
      width: VIEWPORT.width,
      height: VIEWPORT.height,
      durationMs: Date.now() - started,
      capturedAt: Date.now(),
    };
  } catch (err) {
    throw new Error(formatError(err));
  } finally {
    await browser?.close().catch(() => {});
  }
}
