/* ============================================================================
   Visual screenshot diffing
   ----------------------------------------------------------------------------
   Extracted from TddToolkit so the per-pixel hot loop is testable and reusable.

   Two properties matter here:
   - It must not freeze the page. A full-page screenshot is millions of pixels,
     and the naive double loop blocked the main thread for seconds. The diff is
     chunked across frames (`requestIdleCallback`/`requestAnimationFrame`) and
     reports progress, so the UI stays responsive and can show a progress bar.
   - It must be tolerant of rendering noise. `colorDelta` is a YIQ perceptual
     metric (pixelmatch-style) and anti-aliased edges are ignored, so sub-pixel
     text rendering doesn't flood the diff red.
   ========================================================================== */

import type { ScreenshotPair } from "./bridge";

export interface VisualDiffResult extends ScreenshotPair {
  diffPng: string;
  mismatchPixels: number;
  comparedPixels: number;
  mismatchRatio: number;
}

/** Matches the visible "X% diff" badge; ~10% perceptual delta reads as changed. */
const THRESHOLD = 0.1;

/** Rows processed per scheduled chunk. ~64 rows keeps each slice well under a
 *  frame budget on a typical full-page width while minimizing scheduling overhead. */
const ROWS_PER_CHUNK = 64;

function loadPng(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode screenshot PNG."));
    img.src = src;
  });
}

/** Perceptual color distance (0–1), weighted for human luminance sensitivity
 *  like pixelmatch's YIQ metric. Tolerant of small per-channel noise. */
function colorDelta(
  a: Uint8ClampedArray,
  b: Uint8ClampedArray,
  i: number
): number {
  let ar = a[i];
  let ag = a[i + 1];
  let ab = a[i + 2];
  let br = b[i];
  let bg = b[i + 1];
  let bb = b[i + 2];

  // Fast path: screenshots are almost always fully opaque, so skip the
  // white-blend entirely. Only blend when either pixel is translucent so alpha
  // differences don't read as huge color jumps.
  const aa = a[i + 3];
  const ba = b[i + 3];
  if (aa !== 255 || ba !== 255) {
    const af = aa / 255;
    const bf = ba / 255;
    ar = ar * af + 255 * (1 - af);
    ag = ag * af + 255 * (1 - af);
    ab = ab * af + 255 * (1 - af);
    br = br * bf + 255 * (1 - bf);
    bg = bg * bf + 255 * (1 - bf);
    bb = bb * bf + 255 * (1 - bf);
  }

  const y = 0.29889531 * (ar - br) + 0.58662247 * (ag - bg) + 0.11448223 * (ab - bb);
  const i2 = 0.59597799 * (ar - br) - 0.2741761 * (ag - bg) - 0.32180189 * (ab - bb);
  const q = 0.21147017 * (ar - br) - 0.52261711 * (ag - bg) + 0.31114694 * (ab - bb);
  // Normalize to 0–1 (max ~= 35215 for full black↔white).
  return (0.5053 * y * y + 0.299 * i2 * i2 + 0.1957 * q * q) / 35215;
}

/** True when a differing pixel is likely anti-aliasing: surrounded by neighbors
 *  with identical color in the *same* image (an edge), so the sub-pixel
 *  difference is rendering noise, not a real visual change. */
function isAntialiased(
  data: Uint8ClampedArray,
  x: number,
  y: number,
  width: number,
  height: number
): boolean {
  let zeroes = 0;
  const pos = (y * width + x) * 4;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const npos = (ny * width + nx) * 4;
      const same =
        data[pos] === data[npos] &&
        data[pos + 1] === data[npos + 1] &&
        data[pos + 2] === data[npos + 2];
      if (same && ++zeroes > 2) return true;
    }
  }
  return false;
}

/** Schedule a callback during idle time, falling back to rAF where
 *  requestIdleCallback is unavailable (Safari). */
function scheduleChunk(cb: () => void): void {
  const ric = (
    globalThis as typeof globalThis & {
      requestIdleCallback?: (cb: () => void) => number;
    }
  ).requestIdleCallback;
  if (typeof ric === "function") ric(cb);
  else requestAnimationFrame(() => cb());
}

export interface DiffOptions {
  /** Called with 0–1 progress as rows are processed. */
  onProgress?: (ratio: number) => void;
}

/**
 * Compare two screenshots without blocking the main thread. The reference is
 * scaled onto the target's intrinsic grid so a device-pixel-ratio mismatch
 * doesn't report ~100% diff. Work is sliced into row-chunks scheduled across
 * idle callbacks; `onProgress` fires as chunks complete.
 */
export function diffScreenshots(
  pair: ScreenshotPair,
  options: DiffOptions = {}
): Promise<VisualDiffResult> {
  return Promise.all([loadPng(pair.targetPng), loadPng(pair.referencePng)]).then(
    ([target, reference]) =>
      new Promise<VisualDiffResult>((resolve, reject) => {
        // Normalize to the target's intrinsic size. Scaling the reference onto
        // the target's grid keeps rows aligned instead of cropping to min().
        const width = target.naturalWidth;
        const height = target.naturalHeight;
        const targetCanvas = document.createElement("canvas");
        const referenceCanvas = document.createElement("canvas");
        const diffCanvas = document.createElement("canvas");
        targetCanvas.width = referenceCanvas.width = diffCanvas.width = width;
        targetCanvas.height = referenceCanvas.height = diffCanvas.height = height;

        const targetCtx = targetCanvas.getContext("2d");
        const referenceCtx = referenceCanvas.getContext("2d");
        const diffCtx = diffCanvas.getContext("2d");
        if (!targetCtx || !referenceCtx || !diffCtx) {
          reject(new Error("Canvas is not available for visual diffing."));
          return;
        }

        targetCtx.drawImage(target, 0, 0, width, height);
        referenceCtx.drawImage(reference, 0, 0, width, height);
        const t = targetCtx.getImageData(0, 0, width, height).data;
        const r = referenceCtx.getImageData(0, 0, width, height).data;
        const diffData = diffCtx.createImageData(width, height);
        const d = diffData.data;

        let mismatchPixels = 0;
        let y = 0;

        const processChunk = () => {
          const endY = Math.min(height, y + ROWS_PER_CHUNK);
          for (; y < endY; y++) {
            for (let x = 0; x < width; x++) {
              const i = (y * width + x) * 4;
              // A pixel only counts as changed if it exceeds the threshold AND
              // is not anti-aliasing in either image — sub-pixel text edges no
              // longer flood the diff red.
              const changed =
                colorDelta(t, r, i) > THRESHOLD &&
                !isAntialiased(t, x, y, width, height) &&
                !isAntialiased(r, x, y, width, height);
              if (changed) {
                mismatchPixels += 1;
                d[i] = 239;
                d[i + 1] = 68;
                d[i + 2] = 68;
                d[i + 3] = 255;
              } else {
                const gray = Math.round((t[i] + t[i + 1] + t[i + 2]) / 3);
                d[i] = gray;
                d[i + 1] = gray;
                d[i + 2] = gray;
                d[i + 3] = 80;
              }
            }
          }

          if (y < height) {
            options.onProgress?.(height === 0 ? 1 : y / height);
            scheduleChunk(processChunk);
            return;
          }

          options.onProgress?.(1);
          diffCtx.putImageData(diffData, 0, 0);
          const comparedPixels = width * height;
          resolve({
            ...pair,
            width,
            height,
            diffPng: diffCanvas.toDataURL("image/png"),
            mismatchPixels,
            comparedPixels,
            mismatchRatio: comparedPixels === 0 ? 0 : mismatchPixels / comparedPixels,
          });
        };

        // Empty image: nothing to diff.
        if (width === 0 || height === 0) {
          processChunk();
          return;
        }
        scheduleChunk(processChunk);
      })
  );
}
