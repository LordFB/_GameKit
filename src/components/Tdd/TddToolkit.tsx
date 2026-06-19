"use client";

/* ============================================================================
   <TddToolkit /> — a dev-only Next.js TDD overlay
   ----------------------------------------------------------------------------
   "Storybook-like interactive TDD panel for Next.js pages" (concept §positioning).
   A floating launcher opens a dark IDE panel for writing, running, and exporting
   page-specific tests while looking at the page.

   Security boundary (concept §Security boundary): this is effectively an eval
   console, so it renders `null` unless NODE_ENV === "development" (or an
   explicit `enabled` flag is passed). Never ship it enabled to production.
   ========================================================================== */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { TddIcon } from "./icons";
import type { TddIconName } from "./icons";
import {
  loadSnippets,
  saveSnippets,
  loadSettings,
  saveSettings,
  normalizeTestIdAttribute,
  createSnippet,
  duplicateSnippet,
} from "./storage";
import type { Snippet } from "./storage";
import { runSnippet, RUNNER_MODES, RUNNER_GLOBALS } from "./testRunner";
import type { RunOutcome, RunnerMode, ScreenshotAttachment } from "./testRunner";
import { captureScreenshotPair, runViaBridge } from "./bridge";
import type { ScreenshotPair } from "./bridge";
import { useSelectorPicker } from "./useSelectorPicker";
import "./tdd.css";

const MONACO_SNIPPETS: Array<{ label: string; insertText: string; description: string; doc: string }> = [
  {
    label: "pw-getByRole",
    insertText: 'page.getByRole("${1:button}", { name: ${2:/name/i} })',
    description: "Locator by ARIA role + accessible name",
    doc: "Finds an element by semantic role. Prefer this for buttons, links, headings, and form controls.",
  },
  {
    label: "pw-getByText",
    insertText: "page.getByText(${1:/text/i})",
    description: "Locator whose text matches",
    doc: "Finds visible text on the page. Useful for copy and status messages.",
  },
  {
    label: "pw-getByTestId",
    insertText: 'page.getByTestId("${1:id}")',
    description: "Locator by configured test-id attribute",
    doc: "Finds an element by the dashboard's configured test-id attribute. Defaults to data-test.",
  },
  {
    label: "pw-getByLabel",
    insertText: 'page.getByLabel("${1:Email}")',
    description: "Form control by label",
    doc: "Finds an input, select, or textarea by its accessible label.",
  },
  {
    label: "pw-visible",
    insertText: "await expect(${1:locator}).toBeVisible();",
    description: "Assert a locator is rendered and visible",
    doc: "Web-first assertion. Playwright waits for the locator to become visible before failing.",
  },
  {
    label: "pw-text",
    insertText: "await expect(${1:locator}).toHaveText(${2:/text/i});",
    description: "Assert locator text matches",
    doc: "Checks exact or regex text content. Use regex for resilient assertions.",
  },
  {
    label: "pw-click",
    insertText: 'await page.getByRole("${1:button}", { name: ${2:/name/i} }).click();',
    description: "Click a matching locator",
    doc: "Clicks a role-based locator. This needs the Playwright bridge for real browser automation.",
  },
  {
    label: "pw-screenshot",
    insertText: 'await page.screenshot({ path: "screenshots/${1:home}.png", fullPage: true });',
    description: "Capture a Playwright screenshot and attach it to results",
    doc: "Bridge-only. Captured screenshots are attached to the test result and can be opened in the gallery.",
  },
  {
    label: "pw-toHaveScreenshot",
    insertText: 'await expect(page).toHaveScreenshot("${1:home}.png");',
    description: "Snapshot assertion for exported Playwright tests",
    doc: "For exported Playwright tests. Compares the current page to a stored screenshot snapshot.",
  },
  {
    label: "pw-test",
    insertText: 'test("${1:does something}", async () => {\n  ${2:// assertions}\n});',
    description: "Create a Playwright-compatible test block",
    doc: "Registers a test case in the toolkit runner. Use async when awaiting locators, actions, or screenshots.",
  },
];

const MONACO_CDN = "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs";

type MonacoApi = {
  KeyMod: { CtrlCmd: number };
  KeyCode: { Enter: number; KeyS: number };
  Range: new (
    startLineNumber: number,
    startColumn: number,
    endLineNumber: number,
    endColumn: number
  ) => unknown;
  editor: {
    create: (el: HTMLElement, options: Record<string, unknown>) => MonacoEditorInstance;
    defineTheme: (name: string, theme: Record<string, unknown>) => void;
  };
  languages: {
    CompletionItemKind: {
      Snippet: number;
      Function: number;
      Method: number;
      Variable: number;
    };
    CompletionItemInsertTextRule: { InsertAsSnippet: number };
    registerCompletionItemProvider: (
      language: string,
      provider: Record<string, unknown>
    ) => { dispose: () => void };
    typescript: {
      typescriptDefaults: {
        setCompilerOptions: (options: Record<string, unknown>) => void;
        addExtraLib: (source: string, path?: string) => { dispose: () => void };
      };
      ScriptTarget: { ESNext: string };
      ModuleResolutionKind: { NodeJs: string };
    };
  };
};

type MonacoEditorInstance = {
  dispose: () => void;
  getValue: () => string;
  setValue: (value: string) => void;
  focus: () => void;
  onDidChangeModelContent: (listener: () => void) => { dispose: () => void };
  addCommand: (keybinding: number, handler: () => void) => string | null;
  getModel: () => {
    getValue: () => string;
    getOffsetAt: (position: { lineNumber: number; column: number }) => number;
  } | null;
  getSelection: () => {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  } | null;
  executeEdits: (source: string, edits: Array<{ range: unknown; text: string; forceMoveMarkers: boolean }>) => void;
};

declare global {
  interface Window {
    monaco?: MonacoApi;
    require?: {
      config: (options: Record<string, unknown>) => void;
      (deps: string[], callback: () => void): void;
    };
    __tddMonacoLoader?: Promise<MonacoApi>;
  }
}

function loadMonaco(): Promise<MonacoApi> {
  if (typeof window === "undefined") return Promise.reject(new Error("Monaco is client-only."));
  if (window.monaco) return Promise.resolve(window.monaco);
  if (window.__tddMonacoLoader) return window.__tddMonacoLoader;

  window.__tddMonacoLoader = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-tdd-monaco-loader="true"]');
    const script = existing ?? document.createElement("script");
    script.dataset.tddMonacoLoader = "true";
    script.src = `${MONACO_CDN}/loader.js`;
    script.async = true;
    script.onload = () => {
      window.require?.config({ paths: { vs: MONACO_CDN } });
      window.require?.(["vs/editor/editor.main"], () => {
        if (window.monaco) resolve(window.monaco);
        else reject(new Error("Monaco loaded but did not expose window.monaco."));
      });
    };
    script.onerror = () => reject(new Error("Could not load Monaco from the CDN."));
    if (!existing) document.head.appendChild(script);
  });

  return window.__tddMonacoLoader;
}

export interface TddToolkitProps {
  /** Force-enable even outside development (e.g. a staging demo). Default false. */
  enabled?: boolean;
  /** Open the panel on mount. Default false (launcher only). */
  initialOpen?: boolean;
}

interface TabState {
  /** Live, possibly-unsaved code keyed by snippet id. */
  [id: string]: string;
}

interface VisualDiffResult extends ScreenshotPair {
  diffPng: string;
  mismatchPixels: number;
  comparedPixels: number;
  mismatchRatio: number;
}

interface ScreenshotGallery {
  title: string;
  screenshots: ScreenshotAttachment[];
  index: number;
}

function loadPng(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode screenshot PNG."));
    img.src = src;
  });
}

async function diffScreenshots(pair: ScreenshotPair): Promise<VisualDiffResult> {
  const [target, reference] = await Promise.all([
    loadPng(pair.targetPng),
    loadPng(pair.referencePng),
  ]);
  const width = Math.min(target.naturalWidth, reference.naturalWidth);
  const height = Math.min(target.naturalHeight, reference.naturalHeight);
  const targetCanvas = document.createElement("canvas");
  const referenceCanvas = document.createElement("canvas");
  const diffCanvas = document.createElement("canvas");
  targetCanvas.width = referenceCanvas.width = diffCanvas.width = width;
  targetCanvas.height = referenceCanvas.height = diffCanvas.height = height;

  const targetCtx = targetCanvas.getContext("2d");
  const referenceCtx = referenceCanvas.getContext("2d");
  const diffCtx = diffCanvas.getContext("2d");
  if (!targetCtx || !referenceCtx || !diffCtx) {
    throw new Error("Canvas is not available for visual diffing.");
  }

  targetCtx.drawImage(target, 0, 0, width, height);
  referenceCtx.drawImage(reference, 0, 0, width, height);
  const targetData = targetCtx.getImageData(0, 0, width, height);
  const referenceData = referenceCtx.getImageData(0, 0, width, height);
  const diffData = diffCtx.createImageData(width, height);
  let mismatchPixels = 0;

  for (let i = 0; i < targetData.data.length; i += 4) {
    const dr = Math.abs(targetData.data[i] - referenceData.data[i]);
    const dg = Math.abs(targetData.data[i + 1] - referenceData.data[i + 1]);
    const db = Math.abs(targetData.data[i + 2] - referenceData.data[i + 2]);
    const changed = dr + dg + db > 48;
    if (changed) mismatchPixels += 1;
    if (changed) {
      diffData.data[i] = 239;
      diffData.data[i + 1] = 68;
      diffData.data[i + 2] = 68;
      diffData.data[i + 3] = 255;
    } else {
      const gray = Math.round(
        (targetData.data[i] + targetData.data[i + 1] + targetData.data[i + 2]) / 3
      );
      diffData.data[i] = gray;
      diffData.data[i + 1] = gray;
      diffData.data[i + 2] = gray;
      diffData.data[i + 3] = 80;
    }
  }

  diffCtx.putImageData(diffData, 0, 0);
  const comparedPixels = width * height;
  return {
    ...pair,
    width,
    height,
    diffPng: diffCanvas.toDataURL("image/png"),
    mismatchPixels,
    comparedPixels,
    mismatchRatio: comparedPixels === 0 ? 0 : mismatchPixels / comparedPixels,
  };
}

export function TddToolkit({ enabled = false, initialOpen = false }: TddToolkitProps) {
  const isDev = process.env.NODE_ENV === "development" || enabled;

  // Client-only "is hydrated?" flag without setState-in-effect: the server
  // snapshot is always false, the client snapshot always true, so the overlay
  // never participates in SSR markup and there is no hydration mismatch.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [open, setOpen] = useState(initialOpen);
  // Lazy init: loadSnippets() is SSR-safe (seeds when window is undefined) and
  // we render null until `mounted`, so reading localStorage here is hydration-safe.
  const [snippets, setSnippets] = useState<Snippet[]>(() => loadSnippets());
  const [testIdAttributeDraft, setTestIdAttributeDraft] = useState(
    () => loadSettings().testIdAttribute
  );
  const testIdAttribute = normalizeTestIdAttribute(testIdAttributeDraft);
  // null means "no explicit selection" → falls back to the first snippet.
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<TabState>({});
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [runnerMode, setRunnerMode] = useState<RunnerMode>("in-page");
  // Page the Playwright bridge drives. Relative paths resolve against the dev origin.
  const [bridgeUrl, setBridgeUrl] = useState("/");
  const [visualTargetUrl, setVisualTargetUrl] = useState("/");
  const [visualReferenceUrl, setVisualReferenceUrl] = useState("");
  const [visualRunning, setVisualRunning] = useState(false);
  const [visualResult, setVisualResult] = useState<VisualDiffResult | null>(null);
  const [visualError, setVisualError] = useState<string | null>(null);
  const [visualModalOpen, setVisualModalOpen] = useState(false);
  const [visualSlider, setVisualSlider] = useState(50);
  const [screenshotGallery, setScreenshotGallery] = useState<ScreenshotGallery | null>(null);
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [logExpanded, setLogExpanded] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);

  const editorInsertRef = useRef<((text: string) => boolean) | null>(null);

  const active = useMemo(
    () => snippets.find((s) => s.id === activeId) ?? snippets[0] ?? null,
    [snippets, activeId]
  );
  const draftCode = active ? drafts[active.id] ?? active.code : "";
  const isDirty = active ? draftCode !== active.code : false;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return snippets;
    return snippets.filter(
      (s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
    );
  }, [snippets, search]);

  const persist = useCallback((next: Snippet[]) => {
    setSnippets(next);
    saveSnippets(next);
  }, []);

  useEffect(() => {
    saveSettings({ testIdAttribute });
  }, [testIdAttribute]);

  /* ---- snippet CRUD ----------------------------------------------------- */

  const handleNew = useCallback(() => {
    const s = createSnippet();
    persist([s, ...snippets]);
    setActiveId(s.id);
    setRenamingId(s.id);
  }, [persist, snippets]);

  const handleDuplicate = useCallback(() => {
    if (!active) return;
    const copy = duplicateSnippet({ ...active, code: draftCode });
    const idx = snippets.findIndex((s) => s.id === active.id);
    const next = [...snippets];
    next.splice(idx + 1, 0, copy);
    persist(next);
    setActiveId(copy.id);
  }, [active, draftCode, persist, snippets]);

  const handleDelete = useCallback(() => {
    if (!active) return;
    const idx = snippets.findIndex((s) => s.id === active.id);
    const next = snippets.filter((s) => s.id !== active.id);
    persist(next);
    setDrafts((d) => {
      const rest = { ...d };
      delete rest[active.id];
      return rest;
    });
    setActiveId(next[Math.min(idx, next.length - 1)]?.id ?? null);
  }, [active, persist, snippets]);

  const handleSave = useCallback(() => {
    if (!active || !isDirty) return;
    persist(
      snippets.map((s) =>
        s.id === active.id ? { ...s, code: draftCode, updatedAt: Date.now() } : s
      )
    );
    setDrafts((d) => {
      const rest = { ...d };
      delete rest[active.id];
      return rest;
    });
  }, [active, isDirty, draftCode, persist, snippets]);

  const handleRename = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim();
      if (trimmed) {
        persist(
          snippets.map((s) => (s.id === id ? { ...s, name: trimmed, updatedAt: Date.now() } : s))
        );
      }
      setRenamingId(null);
    },
    [persist, snippets]
  );

  const updateDraft = useCallback(
    (code: string) => {
      if (!active) return;
      setDrafts((d) => ({ ...d, [active.id]: code }));
    },
    [active]
  );
  const registerEditorInsert = useCallback((fn: ((text: string) => boolean) | null) => {
    editorInsertRef.current = fn;
  }, []);

  /* ---- run -------------------------------------------------------------- */

  // Show an outcome and auto-expand any failed rows.
  const applyOutcome = useCallback((result: RunOutcome) => {
    setOutcome(result);
    setLogExpanded(new Set());
    setExpanded(
      new Set(result.results.map((r, i) => (r.status === "failed" ? i : -1)).filter((i) => i >= 0))
    );
  }, []);

  // Run one snippet through whichever runner is selected.
  const runOne = useCallback(
    async (code: string): Promise<RunOutcome> => {
      if (runnerMode === "playwright") {
        return runViaBridge(code, bridgeUrl, testIdAttribute);
      }
      // In-page snippets use the same target as the Playwright bridge: the live
      // page DOM. This keeps Playwright-style locator snippets portable between
      // both runner modes.
      return runSnippet(code, document.body, { testIdAttribute });
    },
    [runnerMode, bridgeUrl, testIdAttribute]
  );

  const handleRun = useCallback(async () => {
    if (!active) return;
    setRunning(true);
    setExpanded(new Set());
    setLogExpanded(new Set());
    try {
      // Yield a frame so the loading state paints before a (sync) in-page run blocks.
      await new Promise((r) => requestAnimationFrame(r));
      applyOutcome(await runOne(draftCode));
    } catch (err) {
      applyOutcome({
        results: [{ name: "runner", status: "failed", durationMs: 0, error: String(err), logs: [] }],
        total: 1, passed: 0, failed: 1, durationMs: 0, ranAt: Date.now(),
      });
    } finally {
      setRunning(false);
    }
  }, [active, draftCode, runOne, applyOutcome]);

  const handleRunAll = useCallback(async () => {
    if (snippets.length === 0) return;
    setRunning(true);
    setExpanded(new Set());
    setLogExpanded(new Set());
    await new Promise((r) => requestAnimationFrame(r));
    const merged: RunOutcome = { results: [], total: 0, passed: 0, failed: 0, durationMs: 0, ranAt: Date.now() };
    for (const s of snippets) {
      const r = await runOne(drafts[s.id] ?? s.code);
      merged.results.push(...r.results.map((x) => ({ ...x, name: `${s.name} › ${x.name}` })));
      merged.durationMs += r.durationMs;
    }
    merged.total = merged.results.length;
    merged.passed = merged.results.filter((r) => r.status === "passed").length;
    merged.failed = merged.total - merged.passed;
    applyOutcome(merged);
    setRunning(false);
  }, [snippets, drafts, runOne, applyOutcome]);

  const handleVisualCompare = useCallback(async () => {
    setVisualRunning(true);
    setVisualError(null);
    try {
      const pair = await captureScreenshotPair(visualTargetUrl, visualReferenceUrl);
      setVisualResult(await diffScreenshots(pair));
      setVisualModalOpen(true);
      setVisualSlider(50);
    } catch (err) {
      setVisualError(err instanceof Error ? err.message : String(err));
      setVisualResult(null);
    } finally {
      setVisualRunning(false);
    }
  }, [visualTargetUrl, visualReferenceUrl]);

  /* ---- selector picker -------------------------------------------------- */

  const onPick = useCallback(
    (picked: { snippet: string }) => {
      if (editorInsertRef.current?.(picked.snippet)) return;
      if (active) updateDraft(`${draftCode}${draftCode.endsWith("\n") ? "" : "\n"}${picked.snippet}\n`);
    },
    [active, draftCode, updateDraft]
  );
  const picker = useSelectorPicker(onPick, testIdAttribute);

  // While the picker is armed, hide the overlay so the user can click the page.
  const overlayHidden = picker.active;

  /* ---- export ----------------------------------------------------------- */

  const handleExport = useCallback(() => {
    if (!active) return;
    const escapedName = active.name.replace(/"/g, '\\"');
    const hasRegisteredTests = /\b(?:test|it)\s*\(/.test(draftCode);
    const exportedBody = hasRegisteredTests
      ? draftCode.split("\n").map((l) => "  " + l).join("\n")
      : `  test("${escapedName}", async () => {\n${draftCode.split("\n").map((l) => "    " + l).join("\n")}\n  });`;
    const file = `// ${active.name} — exported from the Next.js TDD Toolkit
import { test, expect, type Page } from "@playwright/test";

test.describe("${escapedName}", () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
  });

${exportedBody}
});
`;
    const blob = new Blob([file], { type: "text/typescript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${active.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.test.ts`;
    a.click();
    URL.revokeObjectURL(url);
  }, [active, draftCode]);

  const copy = useCallback((text: string, key: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1200);
    });
  }, []);

  const insertScreenshotCommand = useCallback(() => {
    const baseName = active?.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "page";
    const command = `await page.screenshot({ path: "screenshots/${baseName}.png", fullPage: true });`;
    if (editorInsertRef.current?.(command)) return;
    if (active) {
      updateDraft(`${draftCode}${draftCode.endsWith("\n") ? "" : "\n"}${command}\n`);
      return;
    }
    copy(command, "screenshot-command");
  }, [active, copy, draftCode, updateDraft]);

  /* ---- keyboard: Esc closes the panel ----------------------------------- */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && screenshotGallery) {
        setScreenshotGallery(null);
        return;
      }
      if (e.key === "Escape" && visualModalOpen) {
        setVisualModalOpen(false);
        return;
      }
      if (e.key === "Escape" && !picker.active && renamingId === null) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, picker.active, renamingId, visualModalOpen, screenshotGallery]);

  if (!isDev || !mounted) return null;

  const fmtTime = (t: number) => new Date(t).toLocaleTimeString();

  return (
    <>
      {!open && (
        <button
          type="button"
          className="tdd-launcher"
          data-tdd-ui=""
          onClick={() => setOpen(true)}
          aria-label="Open the TDD Toolkit"
        >
          <span className="tdd-launcher-glyph">
            <TddIcon name="bolt" size={16} />
          </span>
          TDD Toolkit
        </button>
      )}

      {open && (
        <div
          className="tdd-overlay"
          data-tdd-ui=""
          style={overlayHidden ? { opacity: 0, pointerEvents: "none" } : undefined}
          role="dialog"
          aria-label="Next.js TDD Toolkit"
          aria-modal="false"
        >
          <div className="tdd-shell">
            <button
              type="button"
              className="tdd-icon-button tdd-close"
              onClick={() => setOpen(false)}
              aria-label="Close toolkit"
            >
              <TddIcon name="close" />
            </button>

            <div className="tdd-app">
              {/* Brand header */}
              <header className="tdd-brand">
                <span className="tdd-logo">N</span>
                <div>
                  <h1 className="tdd-brand-title">Next.js - TDD Toolkit</h1>
                  <p className="tdd-brand-subtitle">
                    Write, run, and export page tests while looking at the page.
                  </p>
                </div>
              </header>

              {/* Toolbar */}
              <div className="tdd-toolbar">
                <div className="tdd-toolbar-group">
                  <button
                    type="button"
                    className="tdd-button"
                    data-variant="primary"
                    data-state={running ? "loading" : undefined}
                    onClick={() => void handleRun()}
                    disabled={!active || running}
                  >
                    {!running && <TddIcon name="run" size={13} />}
                    {runnerMode === "playwright" ? "Run in Playwright" : "Run against current page"}
                    <span className="tdd-kbd">⌘↵</span>
                  </button>
                  <button
                    type="button"
                    className="tdd-button"
                    onClick={() => void handleRunAll()}
                    disabled={running || snippets.length === 0}
                  >
                    <TddIcon name="run" size={13} /> Run all
                  </button>
                </div>

                <div className="tdd-toolbar-group">
                  <ToolbarButton icon="plus" label="New" onClick={handleNew} />
                  <ToolbarButton
                    icon="save"
                    label="Save"
                    onClick={handleSave}
                    disabled={!isDirty}
                  />
                  <ToolbarButton icon="duplicate" label="Duplicate" onClick={handleDuplicate} disabled={!active} />
                  <ToolbarButton icon="trash" label="Delete" variant="danger" onClick={handleDelete} disabled={!active} />
                </div>

                <div className="tdd-toolbar-spacer" />

                <div className="tdd-toolbar-group">
                  <ToolbarButton icon="export" label="Export to test file" onClick={handleExport} disabled={!active} />
                </div>
              </div>

              {/* Main grid */}
              <div className="tdd-main-grid">
                {/* Snippets */}
                <section className="tdd-panel tdd-snippets">
                  <div className="tdd-panel-header">
                    <h2 className="tdd-panel-title">Snippets</h2>
                    <span className="tdd-badge" data-tone="neutral">{snippets.length}</span>
                  </div>
                  <div style={{ padding: "8px 8px 0" }}>
                    <input
                      className="tdd-search"
                      placeholder="Search snippets…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="tdd-snippet-list">
                    {filtered.length === 0 && (
                      <div className="tdd-empty">No snippets match “{search}”.</div>
                    )}
                    {filtered.map((s) => (
                      <div
                        key={s.id}
                        role="button"
                        tabIndex={0}
                        className="tdd-snippet"
                        data-state={
                          renamingId === s.id ? "renaming" : s.id === active?.id ? "active" : undefined
                        }
                        onClick={() => setActiveId(s.id)}
                        onDoubleClick={() => setRenamingId(s.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setActiveId(s.id);
                          }
                          if (e.key === "F2") setRenamingId(s.id);
                        }}
                      >
                        <span className="tdd-snippet-icon">
                          <TddIcon name="file" size={16} />
                        </span>
                        <div className="tdd-snippet-body">
                          {renamingId === s.id ? (
                            <input
                              autoFocus
                              className="tdd-rename-input"
                              defaultValue={s.name}
                              onClick={(e) => e.stopPropagation()}
                              onBlur={(e) => handleRename(s.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRename(s.id, e.currentTarget.value);
                                if (e.key === "Escape") setRenamingId(null);
                              }}
                            />
                          ) : (
                            <h3 className="tdd-snippet-title">
                              {s.name}
                              {drafts[s.id] !== undefined && drafts[s.id] !== s.code ? " •" : ""}
                            </h3>
                          )}
                          <p className="tdd-snippet-description">{s.description || "No description"}</p>
                        </div>
                        <span className="tdd-snippet-meta">{new Date(s.updatedAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="tdd-sidebar-actions">
                    <SidebarAction icon="plus" label="New" onClick={handleNew} />
                    <SidebarAction icon="duplicate" label="Copy" onClick={handleDuplicate} disabled={!active} />
                    <SidebarAction
                      icon="file"
                      label="Rename"
                      onClick={() => active && setRenamingId(active.id)}
                      disabled={!active}
                    />
                    <SidebarAction icon="trash" label="Delete" variant="danger" onClick={handleDelete} disabled={!active} />
                  </div>
                </section>

                {/* Editor */}
                <section className="tdd-panel">
                  <div className="tdd-tabs" role="tablist">
                    {active ? (
                      <div className="tdd-tab" role="tab" aria-selected="true" data-state={isDirty ? "dirty" : undefined}>
                        <TddIcon name="file" size={13} />
                        <span className="tdd-tab-label">{active.name}</span>
                        <span className="tdd-file-badge">.test.ts</span>
                        <span className="tdd-tab-dot" />
                      </div>
                    ) : (
                      <div className="tdd-tab" role="tab" aria-selected="true">
                        No snippet
                      </div>
                    )}
                  </div>

                  <div className="tdd-editor">
                    <div /> {/* row 1 reserved (tabs render above) */}
                    {active ? (
                      <MonacoSnippetEditor
                        key={active.id}
                        value={draftCode}
                        onChange={updateDraft}
                        onRun={() => void handleRun()}
                        onSave={handleSave}
                        registerInsert={registerEditorInsert}
                      />
                    ) : (
                      <div className="tdd-editor-empty">Create a snippet to start writing tests.</div>
                    )}
                    <div className="tdd-editor-status">
                      <span>TypeScript</span>
                      <span>{draftCode.split("\n").length} lines</span>
                      <span>
                        globals:{" "}
                        {RUNNER_GLOBALS.join(", ")}
                      </span>
                    </div>
                  </div>
                </section>

                {/* Results */}
                <section className="tdd-panel tdd-results">
                  <div className="tdd-panel-header">
                    <h2 className="tdd-panel-title">Test Results</h2>
                    {outcome && (
                      <span className="tdd-badge" data-tone={outcome.failed ? "danger" : "success"}>
                        {outcome.failed ? `${outcome.failed} failed` : "all passing"}
                      </span>
                    )}
                  </div>

                  {outcome ? (
                    <>
                      <div className="tdd-result-summary">
                        <span className="tdd-badge" data-tone="success">
                          <TddIcon name="check" size={12} /> {outcome.passed} passed
                        </span>
                        <span className="tdd-badge" data-tone={outcome.failed ? "danger" : "neutral"}>
                          <TddIcon name="cross" size={12} /> {outcome.failed} failed
                        </span>
                        <span className="tdd-badge" data-tone="info">{outcome.total} total</span>
                      </div>
                      <div className="tdd-result-meta">
                        <span>Ran at {fmtTime(outcome.ranAt)}</span>
                        <span>{outcome.durationMs} ms</span>
                      </div>
                      <div className="tdd-result-list">
                        {outcome.results.map((r, i) => {
                          const isOpen = expanded.has(i);
                          const logsOpen = logExpanded.has(i);
                          const screenshots = r.screenshots ?? [];
                          return (
                            <div
                              key={i}
                              className="tdd-result-row"
                              data-status={r.status}
                              data-state={isOpen ? "expanded" : undefined}
                            >
                              <span className="tdd-result-icon">
                                <TddIcon name={r.status === "passed" ? "check" : "cross"} size={14} />
                              </span>
                              <div>
                                <button
                                  type="button"
                                  className="tdd-result-toggle"
                                  onClick={() =>
                                    setExpanded((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(i)) next.delete(i);
                                      else next.add(i);
                                      return next;
                                    })
                                  }
                                >
                                  <span className="tdd-result-name">{r.name}</span>
                                  {screenshots.length > 0 && (
                                    <span className="tdd-screenshot-count">
                                      {screenshots.length} screenshot{screenshots.length === 1 ? "" : "s"}
                                    </span>
                                  )}
                                </button>
                                {r.logs.length > 0 && (
                                  <button
                                    type="button"
                                    className="tdd-log-toggle"
                                    aria-expanded={logsOpen}
                                    onClick={() =>
                                      setLogExpanded((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(i)) next.delete(i);
                                        else next.add(i);
                                        return next;
                                      })
                                    }
                                  >
                                    {logsOpen ? "Hide logs" : `Show logs (${r.logs.length})`}
                                  </button>
                                )}
                                {isOpen && r.error && <pre className="tdd-error-block">{r.error}</pre>}
                                {logsOpen && r.logs.length > 0 && (
                                  <pre className="tdd-log-block" data-tone="amber">
                                    {r.logs.join("\n")}
                                  </pre>
                                )}
                                {isOpen && screenshots.length > 0 && (
                                  <div className="tdd-screenshot-strip">
                                    {screenshots.map((shot, shotIndex) => (
                                      <button
                                        type="button"
                                        key={shot.id}
                                        className="tdd-screenshot-thumb"
                                        onClick={() =>
                                          setScreenshotGallery({
                                            title: r.name,
                                            screenshots,
                                            index: shotIndex,
                                          })
                                        }
                                      >
                                        <img src={shot.dataUrl} alt={shot.name} />
                                        <span>{shot.name}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <span className="tdd-result-time">{r.durationMs.toFixed(1)} ms</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="tdd-empty">
                      Run a snippet to see results. Both runners use Playwright-style
                      locator syntax against the live page.
                    </div>
                  )}
                </section>
              </div>

              {/* Bottom grid */}
              <div className="tdd-bottom-grid">
                {/* Selector picker */}
                <section className="tdd-panel tdd-selector-picker" data-interactive="true">
                  <div className="tdd-picker-row">
                    <div>
                      <h2 className="tdd-panel-title" style={{ fontSize: "var(--tdd-text-md)" }}>
                        Selector Picker
                      </h2>
                      <p className="tdd-picker-hint">
                        Click the target, then click any element on the page to insert an assertion.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="tdd-picker-target"
                      data-state={picker.active ? "active" : undefined}
                      onClick={picker.toggle}
                      aria-pressed={picker.active}
                      aria-label="Pick an element"
                    >
                      <TddIcon name="target" size={22} />
                    </button>
                  </div>
                  {picker.picked && (
                    <div className="tdd-selected-element">
                      <span className="tdd-element-pill">
                        <strong>picked</strong> {picker.picked.label}
                      </span>
                      <code className="tdd-selector-code">{picker.picked.snippet}</code>
                      <div className="tdd-selector-actions">
                        <button
                          type="button"
                          className="tdd-button"
                          onClick={() => onPick(picker.picked!)}
                          disabled={!active}
                        >
                          Insert at cursor
                        </button>
                        <button
                          type="button"
                          className="tdd-button"
                          onClick={() => copy(picker.picked!.snippet, "picked")}
                        >
                          {copied === "picked" ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </div>
                  )}
                </section>

                {/* Runner mode */}
                <section className="tdd-panel">
                  <div className="tdd-panel-header">
                    <h2 className="tdd-panel-title" style={{ fontSize: "var(--tdd-text-md)" }}>
                      Runner / Execution Mode
                    </h2>
                  </div>
                  <div className="tdd-runner-options" role="radiogroup" aria-label="Runner mode">
                    {RUNNER_MODES.map((m) => (
                      <button
                        type="button"
                        key={m.id}
                        className="tdd-runner-option"
                        role="radio"
                        aria-checked={runnerMode === m.id}
                        data-state={runnerMode === m.id ? "selected" : undefined}
                        onClick={() => m.available && setRunnerMode(m.id)}
                        disabled={!m.available}
                      >
                        <span className="tdd-runner-icon">
                          <TddIcon name={m.id === "in-page" ? "bolt" : "browser"} size={18} />
                        </span>
                        <div>
                          <p className="tdd-runner-title">
                            {m.title}
                            <span className="tdd-tag">{m.tag}</span>
                          </p>
                          <p className="tdd-runner-description">{m.description}</p>
                        </div>
                        <span className="tdd-radio-dot" />
                      </button>
                    ))}
                    <label style={{ display: "grid", gap: 4 }}>
                      <span className="tdd-picker-hint">Test ID attribute for getByTestId</span>
                      <input
                        className="tdd-input tdd-mono"
                        value={testIdAttributeDraft}
                        onChange={(e) => setTestIdAttributeDraft(e.target.value)}
                        onBlur={() => setTestIdAttributeDraft(testIdAttribute)}
                        placeholder="data-test"
                        aria-label="Test ID attribute"
                      />
                    </label>
                    {runnerMode === "playwright" && (
                      <label style={{ display: "grid", gap: 4 }}>
                        <span className="tdd-picker-hint">Target page (relative to the dev server)</span>
                        <input
                          className="tdd-input tdd-mono"
                          value={bridgeUrl}
                          onChange={(e) => setBridgeUrl(e.target.value)}
                          placeholder="/"
                          aria-label="Playwright target URL"
                        />
                      </label>
                    )}
                  </div>
                </section>

                {/* Visual diff */}
                <section className="tdd-panel tdd-preview">
                  <div className="tdd-visual">
                    <div className="tdd-panel-header">
                      <h2 className="tdd-panel-title" style={{ fontSize: "var(--tdd-text-md)" }}>
                        Visual Diff
                      </h2>
                      {visualResult && (
                        <span className="tdd-badge" data-tone={visualResult.mismatchRatio > 0.01 ? "danger" : "success"}>
                          {(visualResult.mismatchRatio * 100).toFixed(2)}% diff
                        </span>
                      )}
                    </div>

                    <div className="tdd-visual-form">
                      <label>
                        <span className="tdd-picker-hint">Local path</span>
                        <input
                          className="tdd-input tdd-mono"
                          value={visualTargetUrl}
                          onChange={(e) => setVisualTargetUrl(e.target.value)}
                          placeholder="/"
                          aria-label="Visual diff local target path"
                        />
                      </label>
                      <label>
                        <span className="tdd-picker-hint">Reference URL</span>
                        <input
                          className="tdd-input tdd-mono"
                          value={visualReferenceUrl}
                          onChange={(e) => setVisualReferenceUrl(e.target.value)}
                          placeholder="https://example.com/"
                          aria-label="Visual diff reference URL"
                        />
                      </label>
                    </div>

                    <div className="tdd-visual-actions">
                      <button
                        type="button"
                        className="tdd-button"
                        data-variant="primary"
                        data-state={visualRunning ? "loading" : undefined}
                        onClick={() => void handleVisualCompare()}
                        disabled={visualRunning || !visualReferenceUrl.trim()}
                      >
                        {!visualRunning && <TddIcon name="browser" size={13} />}
                        Compare screenshots
                      </button>
                      <button type="button" className="tdd-button" onClick={insertScreenshotCommand}>
                        <TddIcon name="copy" size={13} />
                        Insert screenshot command
                      </button>
                      <button
                        type="button"
                        className="tdd-button"
                        onClick={() => setVisualModalOpen(true)}
                        disabled={!visualResult}
                      >
                        <TddIcon name="target" size={13} />
                        Open comparison
                      </button>
                    </div>

                    {visualError && <pre className="tdd-error-block">{visualError}</pre>}

                    {visualResult ? (
                      <>
                        <div className="tdd-visual-meta">
                          <span>{visualResult.width}x{visualResult.height}</span>
                          <span>{visualResult.durationMs} ms</span>
                          <span>{visualResult.mismatchPixels.toLocaleString()} pixels changed</span>
                        </div>
                        <div className="tdd-visual-grid">
                          <VisualShot title="Local" url={visualResult.targetUrl} src={visualResult.targetPng} />
                          <VisualShot title="Reference" url={visualResult.referenceUrl} src={visualResult.referencePng} />
                          <VisualShot title="Diff" url="red pixels changed" src={visualResult.diffPng} />
                        </div>
                      </>
                    ) : (
                      <div className="tdd-empty">
                        Enter a real reference URL and compare it against a local route.
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* Status bar */}
              <div className="tdd-status-bar">
                <span className="tdd-status-item">
                  <span
                    className="tdd-dot"
                    data-tone={outcome ? (outcome.failed ? "danger" : "success") : "info"}
                  />
                  {outcome ? (outcome.failed ? `${outcome.failed} failing` : "All tests passing") : "Idle"}
                </span>
                <span className="tdd-status-divider" />
                <span className="tdd-status-item">
                  {runnerMode === "in-page" ? "In-page DOM runner" : "Playwright bridge"}
                </span>
                <span className="tdd-status-divider" />
                <span className="tdd-status-item tdd-mono">getByTestId = [{testIdAttribute}]</span>
                <span className="tdd-status-divider" />
                <span className="tdd-status-item tdd-mono">{snippets.length} snippets · localStorage</span>
                <span className="tdd-status-spacer" />
                <span className="tdd-status-item tdd-subtle">dev-only · process.env.NODE_ENV = development</span>
              </div>

              {visualModalOpen && visualResult && (
                <div
                  className="tdd-compare-backdrop"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Visual screenshot comparison"
                >
                  <div className="tdd-compare-modal">
                    <div className="tdd-compare-header">
                      <div>
                        <h2>Visual comparison</h2>
                        <p>
                          {(visualResult.mismatchRatio * 100).toFixed(2)}% changed ·{" "}
                          {visualResult.mismatchPixels.toLocaleString()} pixels
                        </p>
                      </div>
                      <button
                        type="button"
                        className="tdd-icon-button"
                        onClick={() => setVisualModalOpen(false)}
                        aria-label="Close visual comparison"
                      >
                        <TddIcon name="close" />
                      </button>
                    </div>

                    <div className="tdd-compare-frame">
                      <img
                        className="tdd-compare-image"
                        src={visualResult.targetPng}
                        alt="Local screenshot"
                      />
                      <img
                        className="tdd-compare-image tdd-compare-image-top"
                        src={visualResult.referencePng}
                        alt="Reference screenshot"
                        style={{ clipPath: `inset(0 ${100 - visualSlider}% 0 0)` }}
                      />
                      <div className="tdd-compare-divider" style={{ left: `${visualSlider}%` }}>
                        <span />
                      </div>
                      <span className="tdd-compare-label" data-side="left">Reference</span>
                      <span className="tdd-compare-label" data-side="right">Local</span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={visualSlider}
                        onChange={(e) => setVisualSlider(Number(e.target.value))}
                        className="tdd-compare-range"
                        aria-label="Image comparison slider"
                      />
                    </div>

                    <div className="tdd-compare-footer">
                      <div>
                        <strong>Local</strong>
                        <span>{visualResult.targetUrl}</span>
                      </div>
                      <div>
                        <strong>Reference</strong>
                        <span>{visualResult.referenceUrl}</span>
                      </div>
                      <button
                        type="button"
                        className="tdd-button"
                        onClick={() => copy(visualResult.diffPng, "diff-png")}
                      >
                        <TddIcon name={copied === "diff-png" ? "check" : "copy"} size={13} />
                        {copied === "diff-png" ? "Copied diff" : "Copy diff PNG"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {screenshotGallery && (
                <ScreenshotGalleryModal
                  gallery={screenshotGallery}
                  onClose={() => setScreenshotGallery(null)}
                  onIndexChange={(index) =>
                    setScreenshotGallery((current) =>
                      current ? { ...current, index } : current
                    )
                  }
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */

function MonacoSnippetEditor({
  value,
  onChange,
  onRun,
  onSave,
  registerInsert,
}: {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  onSave: () => void;
  registerInsert: (fn: ((text: string) => boolean) | null) => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const monacoRef = useRef<MonacoApi | null>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);
  const onSaveRef = useRef(onSave);
  const [loadError, setLoadError] = useState<string | null>(null);

  valueRef.current = value;
  onChangeRef.current = onChange;
  onRunRef.current = onRun;
  onSaveRef.current = onSave;

  useEffect(() => {
    let cancelled = false;
    let changeSub: { dispose: () => void } | null = null;
    let extraLib: { dispose: () => void } | null = null;
    let completionSub: { dispose: () => void } | null = null;

    loadMonaco().then(
      (monaco) => {
        if (cancelled || !hostRef.current) return;
        monacoRef.current = monaco;
        monaco.editor.defineTheme("tdd-dark", {
          base: "vs-dark",
          inherit: true,
          rules: [
            { token: "comment", foreground: "6b7280", fontStyle: "italic" },
            { token: "string", foreground: "fbbf24" },
            { token: "keyword", foreground: "60a5fa" },
            { token: "number", foreground: "34d399" },
          ],
          colors: {
            "editor.background": "#070a0f",
            "editor.foreground": "#dbeafe",
            "editorLineNumber.foreground": "#475569",
            "editorLineNumber.activeForeground": "#93c5fd",
            "editorCursor.foreground": "#60a5fa",
            "editor.selectionBackground": "#1d4ed880",
            "editor.lineHighlightBackground": "#ffffff08",
          },
        });
        monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
          target: monaco.languages.typescript.ScriptTarget.ESNext,
          moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
          allowNonTsExtensions: true,
          noEmit: true,
          strict: false,
        });
        extraLib = monaco.languages.typescript.typescriptDefaults.addExtraLib(
          `type Role = "button" | "link" | "heading" | "textbox" | "checkbox" | "img" | "list" | "listitem" | string;
type TextMatcher = string | RegExp;
interface TddLocator {
  first(): TddLocator;
  nth(index: number): TddLocator;
  count(): Promise<number>;
  click(): Promise<void>;
  fill(value: string): Promise<void>;
  getAttribute(name: string): Promise<string | null>;
  textContent(): Promise<string | null>;
}
interface TddPage {
  goto(url: string): Promise<void>;
  getByRole(role: Role, options?: { name?: TextMatcher }): TddLocator;
  getByText(text: TextMatcher): TddLocator;
  getByTestId(id: string): TddLocator;
  getByLabel(text: TextMatcher): TddLocator;
  getByPlaceholder(text: TextMatcher): TddLocator;
  locator(selector: string): TddLocator;
  screenshot(options?: { path?: string; fullPage?: boolean }): Promise<Uint8Array>;
  title(): Promise<string> | string;
  url(): string;
}
interface TddExpect {
  toBeVisible(): Promise<void>;
  toBeAttached(): Promise<void>;
  toBeDisabled(): Promise<void>;
  toHaveText(text: TextMatcher): Promise<void>;
  toHaveTextContent(text: TextMatcher): Promise<void>;
  toHaveAttribute(name: string, value?: string | RegExp): Promise<void>;
  toHaveTitle(text: TextMatcher): Promise<void>;
  toHaveScreenshot(name: string): Promise<void>;
  not: TddExpect;
}
declare const page: TddPage;
declare const expect: (actual: unknown) => TddExpect;
declare const test: (name: string, fn: () => unknown | Promise<unknown>) => void;
declare const it: typeof test;
declare const console: Console;`,
          "file:///tdd-globals.d.ts"
        );
        completionSub = monaco.languages.registerCompletionItemProvider("typescript", {
          triggerCharacters: [".", "p", "e", "t"],
          provideCompletionItems: (model: {
            getWordUntilPosition: (position: unknown) => { startColumn: number; endColumn: number };
          }, position: { lineNumber: number; column: number }) => {
            const word = model.getWordUntilPosition(position);
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            };
            const snippetSuggestions = MONACO_SNIPPETS.map((snippet) => ({
              label: snippet.label,
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: snippet.insertText,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: {
                value: `**${snippet.label}**\n\n${snippet.doc}\n\n\`\`\`ts\n${snippet.insertText.replace(/\$\{\d+:([^}]+)\}/g, "$1")}\n\`\`\``,
              },
              detail: snippet.description,
              range,
            }));
            const apiSuggestions = [
              {
                label: "page",
                detail: "Playwright page global",
                kind: monaco.languages.CompletionItemKind.Variable,
                doc: "Main browser page object. In bridge mode it is a real Playwright Page; in local mode it provides locator-compatible helpers only.",
              },
              {
                label: "expect",
                detail: "Playwright expect assertion",
                kind: monaco.languages.CompletionItemKind.Function,
                doc: "Wrap a locator, page, or primitive value and call a matcher like `toBeVisible()` or `toHaveText()`.",
              },
              {
                label: "test",
                detail: "Register a test case",
                kind: monaco.languages.CompletionItemKind.Function,
                doc: "Registers a named test. The toolkit reports each registered test as a separate result row.",
              },
              {
                label: "getByRole",
                detail: "Locate by ARIA role",
                kind: monaco.languages.CompletionItemKind.Method,
                doc: "Preferred locator for user-facing elements. Example: `page.getByRole(\"button\", { name: /save/i })`.",
              },
              {
                label: "getByText",
                detail: "Locate by visible text",
                kind: monaco.languages.CompletionItemKind.Method,
                doc: "Finds text content. Good for status messages and headings when role is not enough.",
              },
              {
                label: "getByTestId",
                detail: "Locate by configured test-id attribute",
                kind: monaco.languages.CompletionItemKind.Method,
                doc: "Stable fallback when semantic locators are hard to express. The attribute is configured in the TDD dashboard.",
              },
              {
                label: "getByLabel",
                detail: "Locate form control by label",
                kind: monaco.languages.CompletionItemKind.Method,
                doc: "Finds inputs by their accessible label. Example: `page.getByLabel(\"Email\")`.",
              },
              {
                label: "locator",
                detail: "Locate by CSS selector",
                kind: monaco.languages.CompletionItemKind.Method,
                doc: "CSS selector fallback. Prefer role/text/label locators when possible.",
              },
              {
                label: "screenshot",
                detail: "Capture and attach screenshot",
                kind: monaco.languages.CompletionItemKind.Method,
                doc: "Bridge-only. `await page.screenshot({ path: \"screenshots/home.png\" })` attaches the PNG to the test output.",
              },
              {
                label: "toBeVisible",
                detail: "Assert visible",
                kind: monaco.languages.CompletionItemKind.Method,
                doc: "Web-first assertion. Waits until the locator is visible or times out.",
              },
              {
                label: "toBeAttached",
                detail: "Assert attached to DOM",
                kind: monaco.languages.CompletionItemKind.Method,
                doc: "Checks that the element exists in the document, visible or not.",
              },
              {
                label: "toHaveText",
                detail: "Assert text",
                kind: monaco.languages.CompletionItemKind.Method,
                doc: "Checks locator text. Supports strings and regular expressions.",
              },
              {
                label: "toHaveScreenshot",
                detail: "Assert screenshot snapshot",
                kind: monaco.languages.CompletionItemKind.Method,
                doc: "For exported Playwright tests. Compares the page or locator against a stored snapshot.",
              },
            ].map(({ label, detail, kind, doc }) => ({
              label,
              kind,
              insertText: label,
              detail,
              documentation: { value: `**${label}**\n\n${doc}` },
              range,
            }));

            return { suggestions: [...snippetSuggestions, ...apiSuggestions] };
          },
        });

        const editor = monaco.editor.create(hostRef.current, {
          value: valueRef.current,
          language: "typescript",
          theme: "tdd-dark",
          automaticLayout: true,
          minimap: { enabled: false },
          fontFamily: "var(--tdd-font-mono)",
          fontSize: 14,
          lineHeight: 22,
          tabSize: 2,
          insertSpaces: true,
          scrollBeyondLastLine: false,
          renderLineHighlight: "line",
          padding: { top: 12, bottom: 12 },
          wordWrap: "off",
          fixedOverflowWidgets: true,
          suggest: {
            showInlineDetails: true,
            showStatusBar: true,
          },
          quickSuggestions: {
            other: true,
            comments: false,
            strings: true,
          },
        });
        editorRef.current = editor;
        changeSub = editor.onDidChangeModelContent(() => {
          const next = editor.getValue();
          valueRef.current = next;
          onChangeRef.current(next);
        });
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRunRef.current());
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => onSaveRef.current());
      },
      (err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err));
      }
    );

    return () => {
      cancelled = true;
      registerInsert(null);
      changeSub?.dispose();
      extraLib?.dispose();
      completionSub?.dispose();
      editorRef.current?.dispose();
      editorRef.current = null;
    };
  }, [registerInsert]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || editor.getValue() === value) return;
    valueRef.current = value;
    editor.setValue(value);
  }, [value]);

  useEffect(() => {
    registerInsert((text: string) => {
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      const model = editor?.getModel();
      const selection = editor?.getSelection();
      if (!editor || !monaco || !model || !selection) return false;
      const offset = model.getOffsetAt({
        lineNumber: selection.startLineNumber,
        column: selection.startColumn,
      });
      const current = model.getValue();
      const prefix = offset > 0 && current[offset - 1] !== "\n" ? "\n" : "";
      const suffix = text.endsWith("\n") ? "" : "\n";
      editor.executeEdits("tdd-insert", [
        {
          range: new monaco.Range(
            selection.startLineNumber,
            selection.startColumn,
            selection.endLineNumber,
            selection.endColumn
          ),
          text: `${prefix}${text}${suffix}`,
          forceMoveMarkers: true,
        },
      ]);
      editor.focus();
      return true;
    });
    return () => registerInsert(null);
  }, [registerInsert]);

  return (
    <div className="tdd-monaco-shell">
      <div ref={hostRef} className="tdd-monaco-editor" aria-label="Test snippet editor" />
      {loadError && <div className="tdd-monaco-error">{loadError}</div>}
    </div>
  );
}

function ToolbarButton({
  icon, label, onClick, disabled, variant,
}: {
  icon: TddIconName;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "danger";
}) {
  return (
    <button
      type="button"
      className="tdd-button"
      data-variant={variant}
      onClick={onClick}
      disabled={disabled}
    >
      <TddIcon name={icon} size={13} /> {label}
    </button>
  );
}

function SidebarAction({
  icon, label, onClick, disabled, variant,
}: {
  icon: TddIconName;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "danger";
}) {
  return (
    <button
      type="button"
      className="tdd-button"
      data-variant={variant}
      onClick={onClick}
      disabled={disabled}
      title={label}
      style={{ height: 32, padding: "0 6px", fontSize: 11 }}
    >
      <TddIcon name={icon} size={13} />
    </button>
  );
}

function VisualShot({ title, url, src }: { title: string; url: string; src: string }) {
  return (
    <figure className="tdd-visual-shot">
      <div className="tdd-visual-shot-header">
        <strong>{title}</strong>
        <span>{url}</span>
      </div>
      <img src={src} alt={`${title} screenshot`} />
    </figure>
  );
}

function ScreenshotGalleryModal({
  gallery,
  onClose,
  onIndexChange,
}: {
  gallery: ScreenshotGallery;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}) {
  const active = gallery.screenshots[gallery.index];
  const lastIndex = gallery.screenshots.length - 1;
  const move = (delta: number) => {
    onIndexChange(Math.min(lastIndex, Math.max(0, gallery.index + delta)));
  };

  return (
    <div
      className="tdd-shot-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Test screenshot gallery"
    >
      <div className="tdd-shot-modal">
        <div className="tdd-shot-header">
          <div>
            <h2>{gallery.title}</h2>
            <p>
              {gallery.index + 1} of {gallery.screenshots.length} · {active.name}
            </p>
          </div>
          <button
            type="button"
            className="tdd-icon-button"
            onClick={onClose}
            aria-label="Close screenshot gallery"
          >
            <TddIcon name="close" />
          </button>
        </div>

        <div className="tdd-shot-stage">
          <button
            type="button"
            className="tdd-shot-nav"
            onClick={() => move(-1)}
            disabled={gallery.index === 0}
            aria-label="Previous screenshot"
          >
            {"<"}
          </button>
          <img src={active.dataUrl} alt={active.name} />
          <button
            type="button"
            className="tdd-shot-nav"
            onClick={() => move(1)}
            disabled={gallery.index === lastIndex}
            aria-label="Next screenshot"
          >
            {">"}
          </button>
        </div>

        <div className="tdd-shot-footer">
          <div>
            <strong>{active.width}x{active.height}</strong>
            {active.path && <span>{active.path}</span>}
          </div>
          <input
            type="range"
            min={0}
            max={lastIndex}
            value={gallery.index}
            onChange={(e) => onIndexChange(Number(e.target.value))}
            disabled={gallery.screenshots.length <= 1}
            aria-label="Screenshot gallery slider"
          />
        </div>
      </div>
    </div>
  );
}
