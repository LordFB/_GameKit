/* ============================================================================
   "Run all" orchestration.
   ----------------------------------------------------------------------------
   The in-page runner is effectively synchronous, but the Playwright bridge is a
   network round-trip per snippet. Running N snippets strictly serially made a
   batch take N× as long with no feedback until the end. `runMany` runs them with
   bounded concurrency (1 for the in-page DOM runner, which shares one live DOM;
   several at once for the bridge) and streams each snippet's result back via
   `onSnippet` so the Results panel can update incrementally.
   ========================================================================== */

import type { RunOutcome, AssertionResult } from "./testRunner";

export interface RunJob {
  /** Stable id for ordering merged results deterministically. */
  id: string;
  name: string;
  code: string;
}

/** Prefix each assertion name with its snippet so merged rows stay traceable. */
function namespaced(name: string, results: AssertionResult[]): AssertionResult[] {
  return results.map((r) => ({ ...r, name: `${name} › ${r.name}` }));
}

function emptyOutcome(): RunOutcome {
  return { results: [], total: 0, passed: 0, failed: 0, durationMs: 0, ranAt: Date.now() };
}

function summarize(results: AssertionResult[], durationMs: number): RunOutcome {
  const passed = results.filter((r) => r.status === "passed").length;
  return {
    results,
    total: results.length,
    passed,
    failed: results.length - passed,
    durationMs,
    ranAt: Date.now(),
  };
}

export interface RunManyOptions {
  /** Max snippets in flight at once. In-page → 1 (shared DOM); bridge → >1. */
  concurrency: number;
  /** Fired as each snippet finishes, with the merged outcome so far. */
  onProgress?: (mergedSoFar: RunOutcome) => void;
}

/**
 * Run every job through `runOne`, preserving job order in the merged output
 * regardless of completion order, while executing up to `concurrency` at once.
 */
export async function runMany(
  jobs: RunJob[],
  runOne: (code: string) => Promise<RunOutcome>,
  { concurrency, onProgress }: RunManyOptions
): Promise<RunOutcome> {
  if (jobs.length === 0) return emptyOutcome();

  // Per-job results kept positional so the merge stays in job order even when a
  // later job finishes first.
  const perJob: Array<AssertionResult[] | null> = new Array(jobs.length).fill(null);
  const durations: number[] = new Array(jobs.length).fill(0);
  let nextIndex = 0;

  const merge = (): RunOutcome => {
    const flat: AssertionResult[] = [];
    let durationMs = 0;
    for (let i = 0; i < jobs.length; i++) {
      if (perJob[i]) flat.push(...perJob[i]!);
      durationMs += durations[i];
    }
    return summarize(flat, durationMs);
  };

  const worker = async () => {
    for (;;) {
      const index = nextIndex++;
      if (index >= jobs.length) return;
      const job = jobs[index];
      const outcome = await runOne(job.code);
      perJob[index] = namespaced(job.name, outcome.results);
      durations[index] = outcome.durationMs;
      onProgress?.(merge());
    }
  };

  const lanes = Math.max(1, Math.min(concurrency, jobs.length));
  await Promise.all(Array.from({ length: lanes }, worker));
  return merge();
}
