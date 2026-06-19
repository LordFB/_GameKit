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

   This file is the orchestrator. The heavy lifting lives in focused modules:
   - visualDiff.ts          non-blocking perceptual screenshot diffing
   - monaco/                CDN editor loader, types, completions, editor component
   - components.tsx         presentational pieces + modals (focus-trapped)
   - hooks.ts               useEscape / useFocusTrap / clipboard feedback
   - state.ts               run + visual-diff reducers
   - runAll.ts              bounded-concurrency "run all"
   ========================================================================== */

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { TddIcon } from "./icons";
import {
  loadSnippets,
  saveSnippets,
  loadSettings,
  saveSettings,
  loadDrafts,
  saveDrafts,
  serializeSnippets,
  parseSnippetImport,
  normalizeTestIdAttribute,
  createSnippet,
  duplicateSnippet,
} from "./storage";
import type { Snippet } from "./storage";
import { runSnippet, RUNNER_MODES, RUNNER_GLOBALS } from "./testRunner";
import type { RunOutcome, RunnerMode } from "./testRunner";
import { captureScreenshotPair, runViaBridge } from "./bridge";
import { diffScreenshots } from "./visualDiff";
import { useSelectorPicker } from "./useSelectorPicker";
import { MonacoSnippetEditor } from "./monaco/MonacoSnippetEditor";
import { useEscape, useFocusTrap, useCopyFeedback } from "./hooks";
import {
  runReducer,
  initialRunState,
  visualReducer,
  initialVisualState,
} from "./state";
import { runMany } from "./runAll";
import {
  ToolbarButton,
  SidebarAction,
  VisualShot,
  VisualCompareModal,
  ScreenshotGalleryModal,
} from "./components";
import type { ScreenshotGallery } from "./components";
import "./tdd.css";

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

/** Trigger a browser download of in-memory text content. */
function downloadFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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
  // Unsaved edits, restored from localStorage so a refresh doesn't lose work.
  const [drafts, setDrafts] = useState<TabState>(() => loadDrafts());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [runnerMode, setRunnerMode] = useState<RunnerMode>("in-page");
  // Page the Playwright bridge drives. Relative paths resolve against the dev origin.
  const [bridgeUrl, setBridgeUrl] = useState("/");
  // Opt-in screen recording of the Playwright session (bridge runner only).
  const [recordVideo, setRecordVideo] = useState(false);
  const [screenshotGallery, setScreenshotGallery] = useState<ScreenshotGallery | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const [run, dispatchRun] = useReducer(runReducer, initialRunState);
  const [visual, dispatchVisual] = useReducer(visualReducer, initialVisualState);
  const { copied, copyFailed, copy } = useCopyFeedback();

  const editorInsertRef = useRef<((text: string) => boolean) | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

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

  // Persist unsaved drafts so a refresh doesn't discard in-progress edits.
  useEffect(() => {
    saveDrafts(drafts);
  }, [drafts]);

  /* ---- snippet CRUD ----------------------------------------------------- */

  const handleNew = useCallback(() => {
    const s = createSnippet();
    persist([s, ...snippets]);
    setActiveId(s.id);
    setRenamingId(s.id);
  }, [persist, snippets]);

  const handleDuplicate = useCallback(() => {
    if (!active) return;
    const copySnippet = duplicateSnippet({ ...active, code: draftCode });
    const idx = snippets.findIndex((s) => s.id === active.id);
    const next = [...snippets];
    next.splice(idx + 1, 0, copySnippet);
    persist(next);
    setActiveId(copySnippet.id);
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

  // Run one snippet through whichever runner is selected.
  const runOne = useCallback(
    async (code: string): Promise<RunOutcome> => {
      if (runnerMode === "playwright") {
        return runViaBridge(code, bridgeUrl, testIdAttribute, recordVideo);
      }
      // In-page snippets use the same target as the Playwright bridge: the live
      // page DOM. This keeps Playwright-style locator snippets portable between
      // both runner modes.
      return runSnippet(code, document.body, { testIdAttribute });
    },
    [runnerMode, bridgeUrl, testIdAttribute, recordVideo]
  );

  const handleRun = useCallback(async () => {
    if (!active) return;
    dispatchRun({ type: "start" });
    try {
      // Yield a frame so the loading state paints before a (sync) in-page run blocks.
      await new Promise((r) => requestAnimationFrame(r));
      dispatchRun({ type: "finish", outcome: await runOne(draftCode) });
    } catch (err) {
      dispatchRun({
        type: "finish",
        outcome: {
          results: [{ name: "runner", status: "failed", durationMs: 0, error: String(err), logs: [] }],
          total: 1,
          passed: 0,
          failed: 1,
          durationMs: 0,
          ranAt: Date.now(),
        },
      });
    }
  }, [active, draftCode, runOne]);

  const handleRunAll = useCallback(async () => {
    if (snippets.length === 0) return;
    dispatchRun({ type: "start" });
    await new Promise((r) => requestAnimationFrame(r));
    const jobs = snippets.map((s) => ({ id: s.id, name: s.name, code: drafts[s.id] ?? s.code }));
    // Both runners must stay serial: the in-page runner shares the single live
    // DOM, and the Playwright bridge single-flights on the server (each run
    // launches a fresh Chromium, so it serializes them and rejects overlap with
    // a 429). Firing several at once just gets all-but-one rejected.
    const merged = await runMany(jobs, runOne, {
      concurrency: 1,
      onProgress: (soFar) => dispatchRun({ type: "finish", outcome: soFar }),
    });
    dispatchRun({ type: "finish", outcome: merged });
  }, [snippets, drafts, runOne]);

  const handleVisualCompare = useCallback(async () => {
    dispatchVisual({ type: "start" });
    try {
      const pair = await captureScreenshotPair(visual.targetUrl, visual.referenceUrl);
      const result = await diffScreenshots(pair, {
        onProgress: (ratio) => dispatchVisual({ type: "progress", ratio }),
      });
      dispatchVisual({ type: "success", result });
    } catch (err) {
      dispatchVisual({ type: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }, [visual.targetUrl, visual.referenceUrl]);

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
    downloadFile(
      file,
      `${active.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.test.ts`,
      "text/typescript"
    );
  }, [active, draftCode]);

  /* ---- export all / import (JSON) --------------------------------------- */

  // Save the *current* drafts into a snapshot so exported snippets include
  // unsaved edits — the dirty dot would otherwise lie about what's exported.
  const handleExportAll = useCallback(() => {
    if (snippets.length === 0) return;
    const withDrafts = snippets.map((s) =>
      drafts[s.id] !== undefined && drafts[s.id] !== s.code ? { ...s, code: drafts[s.id] } : s
    );
    downloadFile(
      serializeSnippets(withDrafts),
      `tdd-snippets-${new Date().toISOString().slice(0, 10)}.json`,
      "application/json"
    );
  }, [snippets, drafts]);

  const handleImportFile = useCallback(
    async (file: File) => {
      setImportError(null);
      try {
        const imported = parseSnippetImport(await file.text());
        // parseSnippetImport already rejects empty results, but guard the
        // indexing defensively so a future change can't throw a confusing
        // "cannot read id of undefined".
        if (imported.length === 0) {
          setImportError("No snippets found in the file.");
          return;
        }
        persist([...imported, ...snippets]);
        setActiveId(imported[0].id);
      } catch (err) {
        setImportError(err instanceof Error ? err.message : String(err));
      }
    },
    [persist, snippets]
  );

  const insertScreenshotCommand = useCallback(() => {
    const baseName = active?.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "page";
    const command = `await page.screenshot({ path: "screenshots/${baseName}.png", fullPage: true });`;
    if (editorInsertRef.current?.(command)) return;
    if (active) {
      updateDraft(`${draftCode}${draftCode.endsWith("\n") ? "" : "\n"}${command}\n`);
      return;
    }
    void copy(command, "screenshot-command");
  }, [active, copy, draftCode, updateDraft]);

  /* ---- keyboard: Esc closes the panel (modals own their own Esc) --------- */
  // Only fires when no modal is open and we aren't mid-rename or picking, so
  // there's no precedence ladder reading stale modal state.
  const panelEscapeActive =
    open && !visual.modalOpen && !screenshotGallery && !picker.active && renamingId === null;
  useEscape(panelEscapeActive, () => setOpen(false));

  const panelRef = useFocusTrap<HTMLDivElement>(open && !overlayHidden);

  if (!isDev || !mounted) return null;

  const fmtTime = (t: number) => new Date(t).toLocaleTimeString();
  const { outcome } = run;

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
          <div className="tdd-shell" ref={panelRef}>
            <button
              type="button"
              className="tdd-icon-button tdd-close"
              onClick={() => setOpen(false)}
              aria-label="Close toolkit"
            >
              <TddIcon name="close" />
            </button>

            <div className="tdd-app">
              {/* Toolbar (with inline brand) */}
              <div className="tdd-toolbar">
                <header className="tdd-brand">
                  <span className="tdd-logo">N</span>
                  <h1 className="tdd-brand-title">Next.js - TDD Toolkit</h1>
                </header>

                <div className="tdd-toolbar-group">
                  <button
                    type="button"
                    className="tdd-button"
                    data-variant="primary"
                    data-state={run.running ? "loading" : undefined}
                    onClick={() => void handleRun()}
                    disabled={!active || run.running}
                  >
                    {!run.running && <TddIcon name="run" size={13} />}
                    {runnerMode === "playwright" ? "Run in Playwright" : "Run against current page"}
                    <span className="tdd-kbd">⌘↵</span>
                  </button>
                  <button
                    type="button"
                    className="tdd-button"
                    onClick={() => void handleRunAll()}
                    disabled={run.running || snippets.length === 0}
                  >
                    <TddIcon name="run" size={13} /> Run all
                  </button>
                </div>

                <div className="tdd-toolbar-group">
                  <ToolbarButton icon="plus" label="New" onClick={handleNew} />
                  <ToolbarButton icon="save" label="Save" onClick={handleSave} disabled={!isDirty} />
                  <ToolbarButton icon="duplicate" label="Duplicate" onClick={handleDuplicate} disabled={!active} />
                  <ToolbarButton icon="trash" label="Delete" variant="danger" onClick={handleDelete} disabled={!active} />
                </div>

                <div className="tdd-toolbar-spacer" />

                <div className="tdd-toolbar-group">
                  <ToolbarButton icon="export" label="Export to test file" onClick={handleExport} disabled={!active} />
                  <ToolbarButton
                    icon="export"
                    label="Export all"
                    onClick={handleExportAll}
                    disabled={snippets.length === 0}
                  />
                  <ToolbarButton
                    icon="import"
                    label="Import"
                    onClick={() => importInputRef.current?.click()}
                  />
                  <input
                    ref={importInputRef}
                    type="file"
                    accept="application/json,.json"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleImportFile(file);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>

              {importError && (
                <pre className="tdd-error-block" style={{ margin: 0 }}>
                  Import failed: {importError}
                </pre>
              )}

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
                      <span>globals: {RUNNER_GLOBALS.join(", ")}</span>
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
                          const isOpen = run.expanded.has(i);
                          const logsOpen = run.logExpanded.has(i);
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
                                  onClick={() => dispatchRun({ type: "toggle-expanded", index: i })}
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
                                    onClick={() => dispatchRun({ type: "toggle-log", index: i })}
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
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
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
                      {outcome.video && (
                        <div className="tdd-session-recording" data-state={run.videoExpanded ? "expanded" : undefined}>
                          <button
                            type="button"
                            className="tdd-session-recording-head"
                            aria-expanded={run.videoExpanded}
                            onClick={() => dispatchRun({ type: "toggle-video" })}
                          >
                            <TddIcon name="chevron-right" size={14} className="tdd-session-recording-caret" />
                            <TddIcon name="browser" size={13} />
                            <span className="tdd-session-recording-title">Session recording</span>
                            <span className="tdd-subtle">
                              {(outcome.video.sizeBytes / 1024 / 1024).toFixed(1)} MB · whole run
                            </span>
                          </button>
                          {run.videoExpanded && (
                            <div className="tdd-session-recording-body">
                              <div className="tdd-result-video-head">
                                <a
                                  className="tdd-log-toggle"
                                  href={outcome.video.dataUrl}
                                  download={outcome.video.name}
                                >
                                  Download {outcome.video.name}
                                </a>
                              </div>
                              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                              <video src={outcome.video.dataUrl} controls />
                            </div>
                          )}
                        </div>
                      )}
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
                          onClick={() => void copy(picker.picked!.snippet, "picked")}
                        >
                          {copied === "picked"
                            ? "Copied!"
                            : copyFailed === "picked"
                              ? "Copy failed"
                              : "Copy"}
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
                  <div className="tdd-runner-options">
                    <div className="tdd-runner-radios" role="radiogroup" aria-label="Runner mode">
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
                            <TddIcon name={m.id === "in-page" ? "bolt" : "browser"} size={15} />
                          </span>
                          <div>
                            <p className="tdd-runner-title">
                              {m.title}
                              <span className="tdd-tag">{m.tag}</span>
                            </p>
                          </div>
                          <span className="tdd-radio-dot" />
                        </button>
                      ))}
                    </div>
                    <div className="tdd-runner-inputs">
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
                    {runnerMode === "playwright" && (
                      <label className="tdd-record-toggle">
                        <input
                          type="checkbox"
                          checked={recordVideo}
                          onChange={(e) => setRecordVideo(e.target.checked)}
                          aria-label="Record video of the Playwright session"
                        />
                        <span>
                          Record video of the run
                          <span className="tdd-picker-hint">
                            Records the Chromium session as a .webm from the first navigation, attached to the results.
                          </span>
                        </span>
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
                      {visual.result && (
                        <span className="tdd-badge" data-tone={visual.result.mismatchRatio > 0.01 ? "danger" : "success"}>
                          {(visual.result.mismatchRatio * 100).toFixed(2)}% diff
                        </span>
                      )}
                    </div>

                    <div className="tdd-visual-form">
                      <label>
                        <span className="tdd-picker-hint">Local path</span>
                        <input
                          className="tdd-input tdd-mono"
                          value={visual.targetUrl}
                          onChange={(e) => dispatchVisual({ type: "set-target", url: e.target.value })}
                          placeholder="/"
                          aria-label="Visual diff local target path"
                        />
                      </label>
                      <label>
                        <span className="tdd-picker-hint">Reference URL</span>
                        <input
                          className="tdd-input tdd-mono"
                          value={visual.referenceUrl}
                          onChange={(e) => dispatchVisual({ type: "set-reference", url: e.target.value })}
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
                        data-state={visual.running ? "loading" : undefined}
                        onClick={() => void handleVisualCompare()}
                        disabled={visual.running || !visual.referenceUrl.trim()}
                      >
                        {!visual.running && <TddIcon name="browser" size={13} />}
                        {visual.running
                          ? `Comparing… ${Math.round(visual.progress * 100)}%`
                          : "Compare screenshots"}
                      </button>
                      <button type="button" className="tdd-button" onClick={insertScreenshotCommand}>
                        <TddIcon name="copy" size={13} />
                        Insert screenshot command
                      </button>
                      <button
                        type="button"
                        className="tdd-button"
                        onClick={() => dispatchVisual({ type: "open-modal" })}
                        disabled={!visual.result}
                      >
                        <TddIcon name="target" size={13} />
                        Open comparison
                      </button>
                    </div>

                    {visual.error && <pre className="tdd-error-block">{visual.error}</pre>}

                    {visual.result ? (
                      <>
                        <div className="tdd-visual-meta">
                          <span>{visual.result.width}x{visual.result.height}</span>
                          <span>{visual.result.durationMs} ms</span>
                          <span>{visual.result.mismatchPixels.toLocaleString()} pixels changed</span>
                        </div>
                        <div className="tdd-visual-grid">
                          <VisualShot title="Local" url={visual.result.targetUrl} src={visual.result.targetPng} />
                          <VisualShot title="Reference" url={visual.result.referenceUrl} src={visual.result.referencePng} />
                          <VisualShot title="Diff" url="red pixels changed" src={visual.result.diffPng} />
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

              {visual.modalOpen && visual.result && (
                <VisualCompareModal
                  result={visual.result}
                  slider={visual.slider}
                  onSlider={(value) => dispatchVisual({ type: "set-slider", value })}
                  onClose={() => dispatchVisual({ type: "close-modal" })}
                  onCopyDiff={() => void copy(visual.result!.diffPng, "diff-png")}
                  copyLabel={{
                    icon: copied === "diff-png" ? "check" : "copy",
                    text:
                      copied === "diff-png"
                        ? "Copied diff"
                        : copyFailed === "diff-png"
                          ? "Copy failed"
                          : "Copy diff PNG",
                  }}
                />
              )}

              {screenshotGallery && (
                <ScreenshotGalleryModal
                  gallery={screenshotGallery}
                  onClose={() => setScreenshotGallery(null)}
                  onIndexChange={(index) =>
                    setScreenshotGallery((current) => (current ? { ...current, index } : current))
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
