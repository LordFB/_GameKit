"use client";

/* eslint-disable @next/next/no-img-element */
/* Every <img> here renders a base64 data URL (a captured screenshot / pixel
   diff). next/image can't optimize data URLs and needs known dimensions, so a
   plain <img> is correct for this dev-only overlay. */

import { useCallback, useState } from "react";
import { TddIcon } from "./icons";
import type { TddIconName } from "./icons";
import { useEscape, useFocusTrap } from "./hooks";
import type { VisualDiffResult } from "./visualDiff";
import type { ScreenshotAttachment } from "./testRunner";

export interface ScreenshotGallery {
  title: string;
  screenshots: ScreenshotAttachment[];
  index: number;
}

export function ToolbarButton({
  icon,
  label,
  onClick,
  disabled,
  variant,
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

export function SidebarAction({
  icon,
  label,
  onClick,
  disabled,
  variant,
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

export function VisualShot({
  title,
  url,
  src,
  onOpen,
}: {
  title: string;
  url: string;
  src: string;
  onOpen?: () => void;
}) {
  return (
    <figure className="tdd-visual-shot">
      <div className="tdd-visual-shot-header">
        <strong>{title}</strong>
        <span>{url}</span>
      </div>
      {onOpen ? (
        <button type="button" className="tdd-visual-shot-image" onClick={onOpen} aria-label={`Open ${title} image`}>
          <img src={src} alt={`${title} screenshot`} />
        </button>
      ) : (
        <img src={src} alt={`${title} screenshot`} />
      )}
    </figure>
  );
}

export function VisualCompareModal({
  result,
  slider,
  onSlider,
  onClose,
  onCopyDiff,
  copyLabel,
}: {
  result: VisualDiffResult;
  slider: number;
  onSlider: (value: number) => void;
  onClose: () => void;
  onCopyDiff: () => void;
  copyLabel: { icon: TddIconName; text: string };
}) {
  const [showDiff, setShowDiff] = useState(false);
  useEscape(true, onClose);
  const trapRef = useFocusTrap<HTMLDivElement>(true);

  return (
    <div className="tdd-compare-backdrop" role="dialog" aria-modal="true" aria-label="Visual screenshot comparison">
      <div className="tdd-compare-modal" ref={trapRef}>
        <div className="tdd-compare-header">
          <div>
            <h2>Visual comparison</h2>
            <p>
              {(result.mismatchRatio * 100).toFixed(2)}% changed ·{" "}
              {result.mismatchPixels.toLocaleString()} pixels
            </p>
          </div>
          <button
            type="button"
            className="tdd-icon-button"
            onClick={onClose}
            aria-label="Close visual comparison"
          >
            <TddIcon name="close" />
          </button>
        </div>

        <div className="tdd-compare-frame">
          {showDiff ? (
            <>
              <img className="tdd-compare-image" src={result.diffPng} alt="Visual difference image" />
              <span className="tdd-compare-label" data-side="left">Diff</span>
            </>
          ) : (
            <>
              <img className="tdd-compare-image" src={result.targetPng} alt="Local screenshot" />
              <img
                className="tdd-compare-image tdd-compare-image-top"
                src={result.referencePng}
                alt="Reference screenshot"
                style={{ clipPath: `inset(0 ${100 - slider}% 0 0)` }}
              />
              <div className="tdd-compare-divider" style={{ left: `${slider}%` }}>
                <span />
              </div>
              <span className="tdd-compare-label" data-side="left">Reference</span>
              <span className="tdd-compare-label" data-side="right">Local</span>
              <input
                type="range"
                min={0}
                max={100}
                value={slider}
                onChange={(e) => onSlider(Number(e.target.value))}
                className="tdd-compare-range"
                aria-label="Image comparison slider"
              />
            </>
          )}
        </div>

        <div className="tdd-compare-footer">
          <div>
            <strong>Local</strong>
            <span>{result.targetUrl}</span>
          </div>
          <div>
            <strong>Reference</strong>
            <span>{result.referenceUrl}</span>
          </div>
          <button type="button" className="tdd-button" onClick={onCopyDiff}>
            <TddIcon name={copyLabel.icon} size={13} />
            {copyLabel.text}
          </button>
          <button
            type="button"
            className="tdd-button"
            aria-pressed={showDiff}
            onClick={() => setShowDiff((visible) => !visible)}
          >
            {showDiff ? "Show slider" : "Show diff image"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** In-tool reference for the development-only TDD workflow. */
export function KnowledgeBaseModal({ onClose }: { onClose: () => void }) {
  const [search, setSearch] = useState("");
  useEscape(true, onClose);
  const trapRef = useFocusTrap<HTMLDivElement>(true);
  const query = search.trim().toLowerCase();
  const includesQuery = (terms: string) => !query || terms.toLowerCase().includes(query);
  const guideMatches = {
    start: includesQuery("overview quick start workflow behavior snippet save export learning picker"),
    writing: includesQuery("write author test snippet expect page screen test it assertion role button locator wait"),
    runners: includesQuery("runner in-page dom iframe playwright bridge chromium external navigation video redirect"),
    selectors: includesQuery("selector picker getbyrole getbylabel getbytext getbytestid css locator test id"),
    requests: includesQuery("cookies headers authorization authentication request tenant redirect session in-page"),
    results: includesQuery("results failure error logs screenshots video locator assertion timeout debug console"),
    visual: includesQuery("visual diff screenshot slider reference local mismatch percentage image gallery"),
    manage: includesQuery("manage library snippets title description rename pencil save draft duplicate import export json"),
    troubleshoot: includesQuery("troubleshoot unable find locator multiple external navigation auth tenant visual high diff"),
    safety: includesQuery("safety security secret production development isolated browser cross origin limitations"),
  };
  const matchingSectionCount = Object.values(guideMatches).filter(Boolean).length;

  return (
    <div className="tdd-knowledge-backdrop" role="dialog" aria-modal="true" aria-label="TDD Toolkit knowledge base">
      <div className="tdd-knowledge-modal" ref={trapRef}>
        <header className="tdd-knowledge-header">
          <div>
            <h2>TDD Toolkit guide</h2>
            <p>Write, run, inspect, and export page-focused checks without leaving the app.</p>
          </div>
          <button type="button" className="tdd-icon-button" onClick={onClose} aria-label="Close knowledge base">
            <TddIcon name="close" />
          </button>
        </header>
        <nav className="tdd-knowledge-nav" aria-label="Knowledge base sections">
          <label className="tdd-knowledge-search">
            <TddIcon name="search" size={14} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search the guide"
              aria-label="Search the TDD Toolkit guide"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} aria-label="Clear guide search">
                <TddIcon name="close" size={12} />
              </button>
            )}
          </label>
          <a href="#tdd-guide-start">Overview</a>
          <a href="#tdd-guide-writing">Authoring</a>
          <a href="#tdd-guide-runners">Runners</a>
          <a href="#tdd-guide-selectors">Selectors</a>
          <a href="#tdd-guide-requests">Requests</a>
          <a href="#tdd-guide-results">Results</a>
          <a href="#tdd-guide-visual">Visual diff</a>
          <a href="#tdd-guide-manage">Library</a>
          <a href="#tdd-guide-troubleshoot">Troubleshoot</a>
          <a href="#tdd-guide-safety">Safety</a>
        </nav>
        <article className="tdd-knowledge-body">
          {search && <p className="tdd-knowledge-results">{matchingSectionCount} matching section{matchingSectionCount === 1 ? "" : "s"} for “{search}”</p>}
          {matchingSectionCount === 0 && (
            <div className="tdd-knowledge-empty">
              No guide sections match that search. Try a feature name such as “cookies”, “visual diff”, “runner”, or “export”.
            </div>
          )}
          <section id="tdd-guide-start" hidden={!guideMatches.start}>
            <h3>1. Understand the workflow</h3>
            <p>The toolkit is a development-time workspace for turning a page behavior into a focused, repeatable check. Each snippet has a title, description, code, run history, and optional visual evidence.</p>
            <ol>
              <li>Start from a user-visible behavior: “the checkout button is available” is better than “the div exists.”</li>
              <li>Pick a runner, select the page state and route, then write the smallest assertion that proves the behavior.</li>
              <li>Run the snippet. Read the exact failed case, error, logs, and captured evidence before changing the test.</li>
              <li>Save a stable snippet. Export it when the check should live in the repository’s Playwright suite.</li>
            </ol>
            <aside className="tdd-knowledge-callout" data-tone="info">
              <strong>Recommended learning loop</strong>
              <span>Pick an element with Selector Picker, read the generated assertion, then refine it into a semantic query that describes the behavior.</span>
            </aside>
          </section>
          <section id="tdd-guide-writing" hidden={!guideMatches.writing}>
            <h3>2. Author a useful test</h3>
            <p>Snippets receive <code>page</code>, <code>expect</code>, <code>screen</code>, <code>test</code>, <code>it</code>, and <code>console</code>. Write named cases with <code>test</code> when one snippet verifies more than one behavior; a snippet without <code>test</code> runs as one implicit case.</p>
            <pre>{`test("save is available", async () => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
});`}</pre>
            <div className="tdd-knowledge-grid">
              <div>
                <strong>Prefer intent</strong>
                <p><code>{'getByRole("button", { name: "Save" })'}</code> stays meaningful when markup changes.</p>
              </div>
              <div>
                <strong>Assert outcomes</strong>
                <p>Verify visible text, enabled state, navigation, or a saved confirmation—not implementation details.</p>
              </div>
              <div>
                <strong>Keep cases narrow</strong>
                <p>One user behavior per case gives failures an obvious cause and faster diagnosis.</p>
              </div>
            </div>
            <p>When a locator matches multiple elements, make the query more specific or use <code>.first()</code> / <code>.nth(index)</code> deliberately. The runner auto-waits for supported DOM assertions, so avoid arbitrary delays.</p>
          </section>
          <section id="tdd-guide-runners" hidden={!guideMatches.runners}>
            <h3>3. Choose the right runner</h3>
            <dl>
              <dt>In-page DOM</dt>
              <dd>Use for fast, local checks against the app currently open in the browser. A same-origin <code>page.goto()</code> uses a hidden iframe automatically. It cannot inspect or navigate cross-origin pages, and it cannot attach custom request headers.</dd>
              <dt>Playwright bridge</dt>
              <dd>Use for an isolated real-browser session, external sites, redirects, custom headers, cookies, screenshots, and session video. The Target page is resolved relative to the development server; snippet navigations may then go elsewhere.</dd>
            </dl>
            <aside className="tdd-knowledge-callout" data-tone="amber">
              <strong>Runner selection rule</strong>
              <span>If a test needs to authenticate, follow redirects, test an external URL, or reproduce a real browser request, use the Playwright bridge.</span>
            </aside>
          </section>
          <section id="tdd-guide-selectors" hidden={!guideMatches.selectors}>
            <h3>4. Find elements reliably</h3>
            <p>Selector Picker lets you click a live element and insert an assertion at the cursor. It is a discovery tool: inspect what it generated, then choose the most durable form for the test.</p>
            <dl>
              <dt>First choice: semantic queries</dt>
              <dd><code>getByRole</code>, <code>getByLabel</code>, and <code>getByText</code> mirror what a user can perceive and operate.</dd>
              <dt>Second choice: test IDs</dt>
              <dd>Use <code>getByTestId</code> for intentional, stable test hooks. Set the matching attribute in Runner settings, for example <code>data-test</code>.</dd>
              <dt>Last choice: CSS locators</dt>
              <dd>Use <code>page.locator()</code> only when semantics are unavailable. Avoid classes tied to visual styling or element position.</dd>
            </dl>
          </section>
          <section id="tdd-guide-requests" hidden={!guideMatches.requests}>
            <h3>5. Configure page requests</h3>
            <p>The request panel is session-only: it is designed for reproducing a page state while developing, not for storing credentials.</p>
            <dl>
              <dt>Cookies</dt>
              <dd>Add a name and value. Playwright seeds them before each document navigation and re-seeds them for external redirect destinations. Put authentication/session values here, not in a hand-written Cookie header.</dd>
              <dt>Headers</dt>
              <dd>Add request-scoped values such as <code>Authorization</code>, feature flags, or tenant headers. They are applied to every Playwright document navigation, including redirect hops.</dd>
              <dt>In-page mode</dt>
              <dd>Same-origin cookies can accompany iframe navigation. Browsers do not allow the toolkit to attach arbitrary headers to an iframe request.</dd>
            </dl>
            <aside className="tdd-knowledge-callout" data-tone="danger">
              <strong>Keep secrets local</strong>
              <span>Cookies and headers disappear when the toolkit session ends. Never save production credentials in snippets or exported JSON.</span>
            </aside>
          </section>
          <section id="tdd-guide-results" hidden={!guideMatches.results}>
            <h3>6. Read results before changing code</h3>
            <p>Each run reports named cases, duration, logs, screenshots, and—when recording is enabled—a browser session video. Expand the failed row first; the first actionable error is usually the cause.</p>
            <div className="tdd-knowledge-grid">
              <div><strong>Locator failure</strong><p>The element did not appear, was ambiguous, or the route/page state was wrong. Recheck the runner, URL, and selector intent.</p></div>
              <div><strong>Assertion failure</strong><p>The element was found but the expected state was false. Treat this as a product or expectation mismatch.</p></div>
              <div><strong>Timeout or navigation failure</strong><p>Verify the route, redirects, cookies, headers, and whether the test should use Playwright instead of the DOM runner.</p></div>
            </div>
            <p>Use <code>console.log()</code> for temporary diagnostics. Development-only React and HMR noise is filtered from Playwright results so the remaining logs are relevant to the test.</p>
          </section>
          <section id="tdd-guide-visual" hidden={!guideMatches.visual}>
            <h3>7. Use visual diff for layout regression</h3>
            <p>Visual Diff captures the local path and reference URL at the same viewport, then reports the proportion of perceptually changed pixels. Use it after behavior checks—not as a replacement for them.</p>
            <ol>
              <li>Enter a stable local route and reference URL.</li>
              <li>Compare screenshots, then use the slider to understand which layout differs.</li>
              <li>Choose <strong>Show diff image</strong> to view the highlighted change map.</li>
              <li>Click Local, Reference, or Diff thumbnails to inspect full-size images in the gallery.</li>
            </ol>
            <p>Dynamic content, animation, dates, ads, and remote personalization create legitimate differences. Stabilize those inputs before treating a percentage as a regression signal.</p>
          </section>
          <section id="tdd-guide-manage" hidden={!guideMatches.manage}>
            <h3>8. Build a useful local test library</h3>
            <p>Snippets and drafts are stored locally in the browser. Name tests after user behavior, and use descriptions to state the page state or risk the test covers.</p>
            <ul>
              <li>Double-click a title to rename it. Double-click a description, or use the pencil action, to edit it.</li>
              <li>Save commits the current code to the local collection; the dirty marker means the editor differs from the saved snippet.</li>
              <li>Duplicate is useful for a related route or state. Delete removes the local snippet only.</li>
              <li>Export one test creates a Playwright file. Export all creates an importable JSON snapshot and includes unsaved code.</li>
              <li>Import validates the toolkit JSON format and adds the imported snippets to the current collection.</li>
            </ul>
          </section>
          <section id="tdd-guide-troubleshoot" hidden={!guideMatches.troubleshoot}>
            <h3>9. Troubleshooting checklist</h3>
            <dl>
              <dt>“Unable to find locator”</dt>
              <dd>Confirm the target route loaded, the selected runner can reach it, and the locator describes the rendered page rather than stale markup.</dd>
              <dt>“Locator matched N elements”</dt>
              <dd>Use an accessible name, a more specific role, a test ID, or an intentional <code>.first()</code>/<code>.nth()</code>.</dd>
              <dt>External navigation fails in DOM mode</dt>
              <dd>Switch to the Playwright bridge. Browser same-origin policy prevents DOM inspection of external pages.</dd>
              <dt>Auth or tenant state is missing</dt>
              <dd>Use Playwright mode and configure Cookies and Headers before running. Check the first document request and redirect destination.</dd>
              <dt>Visual diff is unexpectedly high</dt>
              <dd>Check routes, viewport-sensitive layouts, logged-in state, dynamic content, and animation before changing the visual baseline.</dd>
            </dl>
          </section>
          <section id="tdd-guide-safety" hidden={!guideMatches.safety}>
            <h3>10. Safety and limitations</h3>
            <p>This toolkit is development-only because snippets execute code. The Playwright bridge runs an isolated browser context; the DOM runner uses the page currently open in your development browser.</p>
            <ul>
              <li>Do not put production secrets in snippets, headers, cookies, screenshots, or exported files.</li>
              <li>Use the Playwright bridge for cross-origin navigation and real-browser network behavior.</li>
              <li>Use semantic selectors and explicit page state so tests document product behavior instead of fragile implementation details.</li>
              <li>Export stable checks into the project test suite; local snippets are a development aid, not the team’s source of truth.</li>
            </ul>
          </section>
        </article>
      </div>
    </div>
  );
}

export function ScreenshotGalleryModal({
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
  const move = useCallback(
    (delta: number) => {
      onIndexChange(Math.min(lastIndex, Math.max(0, gallery.index + delta)));
    },
    [gallery.index, lastIndex, onIndexChange]
  );

  useEscape(true, onClose);
  const trapRef = useFocusTrap<HTMLDivElement>(true);

  return (
    <div
      className="tdd-shot-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Test screenshot gallery"
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") move(-1);
        if (e.key === "ArrowRight") move(1);
      }}
    >
      <div className="tdd-shot-modal" ref={trapRef}>
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
          <div className="tdd-shot-frame">
            <img src={active.dataUrl} alt={active.name} />
          </div>
          {gallery.screenshots.length > 1 && (
            <>
              <button
                type="button"
                className="tdd-shot-nav"
                data-side="prev"
                onClick={() => move(-1)}
                disabled={gallery.index === 0}
                aria-label="Previous screenshot"
              >
                <TddIcon name="chevron-left" size={20} />
              </button>
              <button
                type="button"
                className="tdd-shot-nav"
                data-side="next"
                onClick={() => move(1)}
                disabled={gallery.index === lastIndex}
                aria-label="Next screenshot"
              >
                <TddIcon name="chevron-right" size={20} />
              </button>
            </>
          )}
        </div>

        <div className="tdd-shot-footer">
          <div>
            <strong>
              {active.width}x{active.height}
            </strong>
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
