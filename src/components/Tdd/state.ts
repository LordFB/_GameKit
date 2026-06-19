/* ============================================================================
   Reducers for the two coupled state machines in TddToolkit.
   ----------------------------------------------------------------------------
   These used to be ~12 separate useState hooks whose setters had to be called
   in the right order (e.g. "set result, reset slider, open modal"). Grouping
   each into a reducer makes those transitions atomic and self-documenting.
   ========================================================================== */

import type { RunOutcome } from "./testRunner";
import type { VisualDiffResult } from "./visualDiff";

/* ---- run / results ----------------------------------------------------- */

export interface RunState {
  outcome: RunOutcome | null;
  running: boolean;
  /** Result-row indices whose error/screenshots are expanded. */
  expanded: Set<number>;
  /** Result-row indices whose logs are expanded. */
  logExpanded: Set<number>;
}

export const initialRunState: RunState = {
  outcome: null,
  running: false,
  expanded: new Set(),
  logExpanded: new Set(),
};

export type RunAction =
  | { type: "start" }
  | { type: "finish"; outcome: RunOutcome }
  | { type: "toggle-expanded"; index: number }
  | { type: "toggle-log"; index: number };

function toggle(set: Set<number>, index: number): Set<number> {
  const next = new Set(set);
  if (next.has(index)) next.delete(index);
  else next.add(index);
  return next;
}

export function runReducer(state: RunState, action: RunAction): RunState {
  switch (action.type) {
    case "start":
      return { ...state, running: true, expanded: new Set(), logExpanded: new Set() };
    case "finish":
      return {
        outcome: action.outcome,
        running: false,
        logExpanded: new Set(),
        // Auto-expand failed rows so the first thing the user sees is the failure.
        expanded: new Set(
          action.outcome.results
            .map((r, i) => (r.status === "failed" ? i : -1))
            .filter((i) => i >= 0)
        ),
      };
    case "toggle-expanded":
      return { ...state, expanded: toggle(state.expanded, action.index) };
    case "toggle-log":
      return { ...state, logExpanded: toggle(state.logExpanded, action.index) };
    default:
      return state;
  }
}

/* ---- visual diff ------------------------------------------------------- */

export interface VisualState {
  targetUrl: string;
  referenceUrl: string;
  running: boolean;
  /** 0–1 progress of the in-flight diff. */
  progress: number;
  result: VisualDiffResult | null;
  error: string | null;
  modalOpen: boolean;
  /** Comparison-slider position, 0–100. */
  slider: number;
}

export const initialVisualState: VisualState = {
  targetUrl: "/",
  referenceUrl: "",
  running: false,
  progress: 0,
  result: null,
  error: null,
  modalOpen: false,
  slider: 50,
};

export type VisualAction =
  | { type: "set-target"; url: string }
  | { type: "set-reference"; url: string }
  | { type: "start" }
  | { type: "progress"; ratio: number }
  | { type: "success"; result: VisualDiffResult }
  | { type: "error"; message: string }
  | { type: "set-slider"; value: number }
  | { type: "open-modal" }
  | { type: "close-modal" };

export function visualReducer(state: VisualState, action: VisualAction): VisualState {
  switch (action.type) {
    case "set-target":
      return { ...state, targetUrl: action.url };
    case "set-reference":
      return { ...state, referenceUrl: action.url };
    case "start":
      return { ...state, running: true, progress: 0, error: null };
    case "progress":
      return { ...state, progress: action.ratio };
    case "success":
      // Atomic: store the result, reset the slider, and open the modal together.
      return {
        ...state,
        running: false,
        progress: 1,
        result: action.result,
        error: null,
        slider: 50,
        modalOpen: true,
      };
    case "error":
      return { ...state, running: false, result: null, error: action.message };
    case "set-slider":
      return { ...state, slider: action.value };
    case "open-modal":
      return { ...state, modalOpen: true };
    case "close-modal":
      return { ...state, modalOpen: false };
    default:
      return state;
  }
}
