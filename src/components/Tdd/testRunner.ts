/* ============================================================================
   In-page test runner
   ----------------------------------------------------------------------------
   A tiny, dependency-free assertion + query engine that runs a snippet of test
   code directly inside the current browser tab (concept §1 "In-page tests").

   It deliberately does NOT pretend to be Playwright — the real-automation path
   (concept §2) needs a Node-side process, which a browser tab cannot become.
   That path is the separate Playwright bridge (bridge.ts → /__tdd/run →
   playwrightRunner.server.ts); both runners return this same RunOutcome shape.
   ========================================================================== */

import { createIframeSession, type IframeSession } from "./iframeNavigator";

export type RunnerMode = "in-page" | "playwright";

export interface ScreenshotAttachment {
  id: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
  path?: string;
  takenAt: number;
}

export interface AssertionResult {
  name: string;
  status: "passed" | "failed";
  durationMs: number;
  error?: string;
  logs: string[];
  screenshots?: ScreenshotAttachment[];
}

/**
 * A screen recording of the whole runner session. Only the Playwright bridge
 * can produce one (the in-page runner has no browser to record); it is attached
 * to the RunOutcome rather than a single result because Playwright records the
 * entire context, not per-test.
 */
export interface VideoAttachment {
  id: string;
  name: string;
  /** `data:video/webm;base64,…` so the Results panel can <video src> it directly. */
  dataUrl: string;
  /** Bytes of the encoded video, for a human-readable size hint. */
  sizeBytes: number;
  takenAt: number;
}

export interface RunOutcome {
  results: AssertionResult[];
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  ranAt: number;
  /** Present only when video recording was requested on the Playwright bridge. */
  video?: VideoAttachment;
}

export interface RunnerOptions {
  testIdAttribute?: string;
  /** Cookies applied for same-origin iframe requests made by page.goto(). */
  cookies?: Array<{ name: string; value: string }>;
  /**
   * Let page.goto("/route") load a SAME-ORIGIN route into an offscreen iframe so
   * the in-page runner queries/clicks/screenshots that navigated page. Default
   * false: goto() is a no-op and the runner tests the live tab. Cross-origin
   * URLs are rejected with a "use the Playwright bridge" message.
   */
  enableNavigation?: boolean;
}

const COOKIE_NAME = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

/**
 * The in-page runner navigates with a hidden iframe, not a Playwright browser
 * context. Seed its same-origin request cookies in the document cookie jar and
 * restore the visible root-path values after the run finishes.
 */
function seedInPageCookies(cookies: RunnerOptions["cookies"]): () => void {
  if (!cookies?.length || typeof document === "undefined") return () => {};

  const valid = cookies.filter(
    (cookie) =>
      COOKIE_NAME.test(cookie.name) &&
      !/[;\r\n]/.test(cookie.value)
  );
  const existing = new Map(
    document.cookie
      .split(/;\s*/)
      .filter(Boolean)
      .map((entry) => {
        const equalsAt = entry.indexOf("=");
        return equalsAt < 0 ? [entry, ""] : [entry.slice(0, equalsAt), entry.slice(equalsAt + 1)];
      })
  );

  for (const cookie of valid) {
    document.cookie = `${cookie.name}=${cookie.value}; Path=/; SameSite=Lax`;
  }

  return () => {
    for (const cookie of valid) {
      const previous = existing.get(cookie.name);
      document.cookie = previous === undefined
        ? `${cookie.name}=; Path=/; Max-Age=0; SameSite=Lax`
        : `${cookie.name}=${previous}; Path=/; SameSite=Lax`;
    }
  };
}

export const RUNNER_MODES: Array<{
  id: RunnerMode;
  title: string;
  description: string;
  tag: string;
  available: boolean;
}> = [
  {
    id: "in-page",
    title: "In-page DOM runner",
    description:
      "Runs assertions against the live page in this tab. Fast, zero setup. Best for visibility, text, roles, and DOM shape.",
    tag: "ready",
    available: true,
  },
  {
    id: "playwright",
    title: "Playwright bridge",
    description:
      "Real browser automation (navigation, clicks, network) in a Node-launched Chromium via POST /__tdd/run. Dev-only.",
    tag: "ready",
    available: true,
  },
];

/* -------------------------------------------------------------------------- */
/* Assertion API                                                              */
/* -------------------------------------------------------------------------- */

class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssertionError";
  }
}

function describe(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return JSON.stringify(value);
  if (value instanceof Element) {
    const tag = value.tagName.toLowerCase();
    const text = (value.textContent ?? "").trim().slice(0, 40);
    return `<${tag}>${text ? ` "${text}"` : ""}`;
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function isVisible(el: Element | null): boolean {
  // Elements inside the in-page navigator iframe belong to its Window realm,
  // so `el instanceof HTMLElement` against the parent window is false. Use
  // DOM capabilities instead, which work for both the live page and iframe.
  if (!el || !("style" in el) || !("hidden" in el)) return false;
  const htmlEl = el as HTMLElement;
  if (htmlEl.hidden) return false;
  const style = el.ownerDocument.defaultView?.getComputedStyle(el);
  if (style) {
    if (style.display === "none") return false;
    if (style.visibility === "hidden" || style.visibility === "collapse") return false;
    if (Number(style.opacity) === 0) return false;
  }
  // offsetParent is null for display:none or fixed-position-in-hidden subtrees.
  return htmlEl.offsetParent !== null || el.getClientRects().length > 0;
}

interface InPageLocator {
  readonly __tddLocator: true;
  resolveAll(): Element[];
  resolveOne(): Element;
  first(): InPageLocator;
  nth(index: number): InPageLocator;
  all(): Promise<InPageLocator[]>;
  count(): Promise<number>;
  click(): Promise<void>;
  fill(value: string): Promise<void>;
  getAttribute(name: string): Promise<string | null>;
  textContent(): Promise<string | null>;
  isVisible(): Promise<boolean>;
  locator(selector: string): InPageLocator;
}

function isInPageLocator(value: unknown): value is InPageLocator {
  return Boolean(value && typeof value === "object" && (value as InPageLocator).__tddLocator);
}

function makeLocator(root: ParentNode, find: () => Element[], label: string): InPageLocator {
  const resolveOne = () => {
    const els = find();
    if (els.length === 0) throw new AssertionError(`Unable to find locator: ${label}`);
    if (els.length > 1) {
      throw new AssertionError(`Locator matched ${els.length} elements: ${label}. Use .first() or .nth().`);
    }
    return els[0];
  };

  const dispatchInput = (el: Element) => {
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const locator: InPageLocator = {
    __tddLocator: true,
    resolveAll: find,
    resolveOne,
    first: () => makeLocator(root, () => find().slice(0, 1), `${label}.first()`),
    nth: (index: number) => makeLocator(root, () => find().slice(index, index + 1), `${label}.nth(${index})`),
    all: async () => find().map((_, index) => locator.nth(index)),
    count: async () => find().length,
    click: async () => {
      const el = resolveOne();
      if (!(el instanceof HTMLElement)) throw new AssertionError(`Locator is not clickable: ${label}`);
      el.click();
    },
    fill: async (value: string) => {
      const el = resolveOne();
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        el.value = value;
        dispatchInput(el);
        return;
      }
      if (el instanceof HTMLSelectElement) {
        el.value = value;
        dispatchInput(el);
        return;
      }
      throw new AssertionError(`Locator is not fillable: ${label}`);
    },
    getAttribute: async (name: string) => resolveOne().getAttribute(name),
    textContent: async () => resolveOne().textContent,
    isVisible: async () => isVisible(resolveOne()),
    locator: (selector: string) =>
      makeLocator(
        root,
        () => find().flatMap((el) => Array.from(el.querySelectorAll(selector))),
        `${label}.locator(${JSON.stringify(selector)})`
      ),
  };

  return locator;
}

/** Default time a DOM-dependent matcher retries before failing. */
const ASSERTION_TIMEOUT_MS = 1000;
const ASSERTION_POLL_MS = 30;

/**
 * Web-first matchers return a `PendingAssertion`: a Promise the snippet may
 * `await` (it retries the underlying check until it passes or the deadline
 * elapses, mirroring Playwright's auto-waiting). The same object is registered
 * with the active runner so a NON-awaited assertion still fails its test — see
 * `pushPending` / `drainPending` in runSnippet.
 */
type PendingAssertion = Promise<void>;

interface Matchers {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toBeNull(): void;
  toBeDefined(): void;
  toContain(substring: string): void;
  toHaveText(text: string | RegExp): PendingAssertion;
  toHaveTextContent(text: string | RegExp): PendingAssertion;
  toHaveAttribute(name: string, value?: string | RegExp): PendingAssertion;
  toHaveTitle(text: string | RegExp): PendingAssertion;
  toBeVisible(): PendingAssertion;
  toBeAttached(): PendingAssertion;
  toBeInTheDocument(): PendingAssertion;
  toBeDisabled(): PendingAssertion;
  toBeChecked(): PendingAssertion;
}

/** Pending DOM-assertion sink, swapped in by the runner around each test. */
let pendingSink: PendingAssertion[] = [];

function makeExpect(actual: unknown, negated = false): Matchers & { not: Matchers } {
  const check = (pass: boolean, message: string) => {
    if (pass === negated) {
      throw new AssertionError(negated ? `Expected NOT: ${message}` : message);
    }
  };
  const textMatches = (value: string, expected: string | RegExp) =>
    expected instanceof RegExp ? expected.test(value) : value.includes(expected);

  // Re-resolve the element on each retry: a locator may match something that did
  // not exist when expect() was first called (the whole point of auto-waiting).
  const resolveEl = (): Element | null =>
    actual instanceof Element ? actual : isInPageLocator(actual) ? actual.resolveOne() : null;

  // Run a DOM-dependent matcher, retrying until it passes or the deadline. The
  // returned promise is also tracked so a non-awaited call still fails the test.
  const web = (evaluate: (el: Element | null) => void): PendingAssertion => {
    const deadline = Date.now() + ASSERTION_TIMEOUT_MS;
    const attempt = async (): Promise<void> => {
      for (;;) {
        try {
          // resolveEl() itself throws when a locator matches 0 / >1 elements;
          // retrying lets the element appear (or settle to one) before failing.
          evaluate(resolveEl());
          return;
        } catch (err) {
          if (Date.now() >= deadline) throw err;
          await new Promise((r) => setTimeout(r, ASSERTION_POLL_MS));
        }
      }
    };
    const promise = attempt();
    pendingSink.push(promise);
    return promise;
  };

  const matchers: Matchers = {
    toBe(expected) {
      check(Object.is(actual, expected), `expected ${describe(actual)} to be ${describe(expected)}`);
    },
    toEqual(expected) {
      check(
        JSON.stringify(actual) === JSON.stringify(expected),
        `expected ${describe(actual)} to equal ${describe(expected)}`
      );
    },
    toBeTruthy() {
      check(Boolean(actual), `expected ${describe(actual)} to be truthy`);
    },
    toBeFalsy() {
      check(!actual, `expected ${describe(actual)} to be falsy`);
    },
    toBeNull() {
      check(actual === null, `expected ${describe(actual)} to be null`);
    },
    toBeDefined() {
      check(actual !== undefined && actual !== null, `expected value to be defined, got ${describe(actual)}`);
    },
    toContain(substring) {
      const ok =
        typeof actual === "string"
          ? actual.includes(substring)
          : Array.isArray(actual)
            ? actual.includes(substring)
            : false;
      check(ok, `expected ${describe(actual)} to contain ${describe(substring)}`);
    },
    toHaveText(text) {
      return web((el) => {
        const content = el?.textContent ?? "";
        check(textMatches(content, text), `expected element to have text ${describe(text)}, got ${describe(content.trim())}`);
      });
    },
    toHaveTextContent(text) {
      return web((el) => {
        const content = el?.textContent ?? "";
        check(textMatches(content, text), `expected element to have text ${describe(text)}, got ${describe(content.trim())}`);
      });
    },
    toHaveAttribute(name, value) {
      return web((el) => {
        const has = el?.hasAttribute(name) ?? false;
        if (value === undefined) {
          check(has, `expected element to have attribute "${name}"`);
        } else {
          const actualValue = el?.getAttribute(name) ?? "";
          const ok = value instanceof RegExp ? value.test(actualValue) : actualValue === value;
          check(ok, `expected attribute "${name}" to be ${describe(value)}, got ${describe(actualValue)}`);
        }
      });
    },
    toHaveTitle(text) {
      return web(() => {
        const title = actual && typeof actual === "object" && "title" in actual && typeof actual.title === "function"
          ? String(actual.title())
          : "";
        check(textMatches(title, text), `expected page title to match ${describe(text)}, got ${describe(title)}`);
      });
    },
    toBeVisible() {
      return web((el) => check(isVisible(el), `expected ${describe(actual)} to be visible`));
    },
    toBeAttached() {
      return web((el) => check(Boolean(el && el.ownerDocument.contains(el)), `expected element to be attached`));
    },
    toBeInTheDocument() {
      return web((el) => check(Boolean(el && el.ownerDocument.contains(el)), `expected element to be in the document`));
    },
    toBeDisabled() {
      return web((el) => {
        const disabled = el instanceof HTMLButtonElement || el instanceof HTMLInputElement ? el.disabled : el?.getAttribute("aria-disabled") === "true";
        check(Boolean(disabled), `expected element to be disabled`);
      });
    },
    toBeChecked() {
      return web((el) => {
        const checked = el instanceof HTMLInputElement ? el.checked : el?.getAttribute("aria-checked") === "true";
        check(Boolean(checked), `expected element to be checked`);
      });
    },
  };

  // NB: use defineProperty, NOT Object.assign — assign *reads* (invokes) the
  // `not` getter while copying it, which would recurse into makeExpect forever.
  Object.defineProperty(matchers, "not", {
    get: () => makeExpect(actual, !negated),
    enumerable: false,
    configurable: true,
  });
  return matchers as Matchers & { not: Matchers };
}

/* -------------------------------------------------------------------------- */
/* testing-library-style queries                                              */
/* -------------------------------------------------------------------------- */

const ROLE_SELECTORS: Record<string, string> = {
  button: 'button, [role="button"], input[type="button"], input[type="submit"]',
  link: 'a[href], [role="link"]',
  heading: 'h1, h2, h3, h4, h5, h6, [role="heading"]',
  textbox: 'input:not([type="hidden"]):not([type="button"]):not([type="submit"]), textarea, [role="textbox"]',
  checkbox: 'input[type="checkbox"], [role="checkbox"]',
  img: 'img, [role="img"]',
  list: 'ul, ol, [role="list"]',
  listitem: 'li, [role="listitem"]',
};

function accessibleName(el: Element): string {
  const label = el.getAttribute("aria-label");
  if (label) return label.trim();
  if (el instanceof HTMLImageElement && el.alt) return el.alt.trim();
  return (el.textContent ?? "").trim();
}

function nameMatches(actual: string, expected: string | RegExp): boolean {
  if (expected instanceof RegExp) return expected.test(actual);
  return actual.toLowerCase() === expected.toLowerCase() || actual.toLowerCase().includes(expected.toLowerCase());
}

function normalizeTestIdAttribute(value?: string): string {
  const attr = value?.trim() || "data-test";
  return /^[A-Za-z_][A-Za-z0-9_.:-]*$/.test(attr) ? attr : "data-test";
}

function escapeAttrValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// `getRoot` is a function (not a fixed node) so queries follow the current root
// after page.goto() swaps it to the navigated iframe's document. See makePage.
function makeScreen(getRoot: () => ParentNode, options: RunnerOptions = {}) {
  const testIdAttribute = normalizeTestIdAttribute(options.testIdAttribute);
  const byText = (text: string | RegExp): Element[] => {
    const root = getRoot();
    const out: Element[] = [];
    const walker = (root.ownerDocument ?? document).createTreeWalker(
      root as Node,
      NodeFilter.SHOW_ELEMENT
    );
    let node = walker.nextNode() as Element | null;
    while (node) {
      const own = Array.from(node.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent ?? "")
        .join("")
        .trim();
      if (own && nameMatches(own, text)) out.push(node);
      node = walker.nextNode() as Element | null;
    }
    return out;
  };

  const byRole = (role: string, options?: { name?: string | RegExp }): Element[] => {
    const selector = ROLE_SELECTORS[role] ?? `[role="${role}"]`;
    let els = Array.from(getRoot().querySelectorAll(selector));
    if (options?.name !== undefined) {
      els = els.filter((el) => nameMatches(accessibleName(el), options.name!));
    }
    return els;
  };

  const byTestId = (id: string): Element[] =>
    Array.from(getRoot().querySelectorAll(`[${testIdAttribute}="${escapeAttrValue(id)}"]`));

  const byLabelText = (text: string | RegExp): Element[] => {
    const root = getRoot();
    const labels = Array.from(root.querySelectorAll("label")).filter((l) =>
      nameMatches((l.textContent ?? "").trim(), text)
    );
    return labels
      .map((l) => {
        const forId = l.getAttribute("for");
        if (forId) return root.querySelector(`#${CSS.escape(forId)}`);
        return l.querySelector("input, textarea, select");
      })
      .filter((x): x is Element => Boolean(x));
  };

  const single = (kind: string, query: string | RegExp, els: Element[]): Element => {
    if (els.length === 0) throw new AssertionError(`Unable to find an element by ${kind}: ${describe(query)}`);
    if (els.length > 1) throw new AssertionError(`Found ${els.length} elements by ${kind}: ${describe(query)} (use getAllBy*)`);
    return els[0];
  };

  return {
    getByText: (t: string | RegExp) => single("text", t, byText(t)),
    queryByText: (t: string | RegExp) => byText(t)[0] ?? null,
    getAllByText: (t: string | RegExp) => byText(t),
    getByRole: (r: string, o?: { name?: string | RegExp }) => single("role", o?.name ?? r, byRole(r, o)),
    queryByRole: (r: string, o?: { name?: string | RegExp }) => byRole(r, o)[0] ?? null,
    getAllByRole: (r: string, o?: { name?: string | RegExp }) => byRole(r, o),
    getByTestId: (id: string) => single("testId", id, byTestId(id)),
    queryByTestId: (id: string) => byTestId(id)[0] ?? null,
    getAllByTestId: (id: string) => byTestId(id),
    getByLabelText: (t: string | RegExp) => single("label", t, byLabelText(t)),
    getAllByLabelText: (t: string | RegExp) => byLabelText(t),
  };
}

interface PageEnv {
  /** Current query root — swapped to the iframe document after page.goto(). */
  getRoot: () => ParentNode;
  options?: RunnerOptions;
  /** Per-test log/notice sink (read lazily so per-test swaps are respected). */
  notify?: (message: string) => void;
  /** Navigate the in-page iframe; absent → goto is a no-op (live-page mode). */
  navigate?: (url: string) => Promise<void>;
  /** Rasterize the navigated page; absent → screenshot is skipped with a notice. */
  capture?: () => Promise<{ dataUrl: string; width: number; height: number }>;
  /** Register a captured screenshot so it shows in the result row. */
  onScreenshot?: (shot: ScreenshotAttachment) => void;
}

function makePage(env: PageEnv) {
  const { getRoot, options = {}, notify = () => {}, navigate, capture, onScreenshot } = env;
  const screen = makeScreen(getRoot, options);
  const doc = () => getRoot().ownerDocument ?? document;

  const queryAll = (selector: string): Element[] => {
    const root = getRoot();
    const self = root instanceof Element && (root.matches(selector) || selector === "body") ? [root] : [];
    return [...self, ...Array.from(root.querySelectorAll(selector))];
  };

  const byPlaceholder = (text: string | RegExp): Element[] => {
    const els = queryAll("[placeholder]");
    return els.filter((el) => nameMatches(el.getAttribute("placeholder") ?? "", text));
  };

  let screenshotCount = 0;

  return {
    // With an iframe navigator, page.goto() loads a same-origin route and the
    // query root follows it. Without one (testing the live tab) it's a no-op.
    goto: async (url?: string) => {
      if (navigate && typeof url === "string") await navigate(url);
    },
    waitForLoadState: async () => {},
    // Same-origin screenshots are captured from the navigated iframe via canvas.
    // Live-page mode (no capture) keeps the old "skipped" notice so snippets that
    // don't navigate still run unchanged.
    screenshot: async (opts?: { path?: string }): Promise<Uint8Array> => {
      if (!capture) {
        notify(
          "ⓘ page.screenshot() was skipped — capture only works after page.goto() loads a same-origin route. Switch to the Playwright bridge for live-tab or cross-origin captures."
        );
        return new Uint8Array();
      }
      const { dataUrl, width, height } = await capture();
      screenshotCount += 1;
      const path = opts?.path;
      const name = path ? path.split(/[\\/]/).at(-1) || `screenshot-${screenshotCount}.png` : `screenshot-${screenshotCount}.png`;
      onScreenshot?.({
        id: `shot_${Date.now().toString(36)}_${screenshotCount}`,
        name,
        path,
        dataUrl,
        width,
        height,
        takenAt: Date.now(),
      });
      return new Uint8Array();
    },
    title: () => doc().title,
    url: () => doc().location?.href ?? "",
    locator: (selector: string) =>
      makeLocator(getRoot(), () => queryAll(selector), `page.locator(${JSON.stringify(selector)})`),
    getByRole: (role: string, options?: { name?: string | RegExp }) =>
      makeLocator(getRoot(), () => screen.getAllByRole(role, options), `page.getByRole(${JSON.stringify(role)})`),
    getByText: (text: string | RegExp) =>
      makeLocator(getRoot(), () => screen.getAllByText(text), `page.getByText(${describe(text)})`),
    getByTestId: (id: string) =>
      makeLocator(getRoot(), () => screen.getAllByTestId(id), `page.getByTestId(${JSON.stringify(id)})`),
    getByLabel: (text: string | RegExp) =>
      makeLocator(getRoot(), () => screen.getAllByLabelText(text), `page.getByLabel(${describe(text)})`),
    getByLabelText: (text: string | RegExp) =>
      makeLocator(getRoot(), () => screen.getAllByLabelText(text), `page.getByLabelText(${describe(text)})`),
    getByPlaceholder: (text: string | RegExp) =>
      makeLocator(getRoot(), () => byPlaceholder(text), `page.getByPlaceholder(${describe(text)})`),
  };
}

/* -------------------------------------------------------------------------- */
/* Runner                                                                     */
/* -------------------------------------------------------------------------- */

interface RegisteredTest {
  name: string;
  fn: () => void | Promise<void>;
}

const TEST_TIMEOUT_MS = 5000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`test timed out after ${ms}ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

/**
 * Await every web-first assertion started since the sink was reset, throwing
 * the first failure. This catches NON-awaited assertions (the in-page sync
 * style: `expect(el).toBeVisible()`) so an un-awaited failure is never a silent
 * false positive — matching the Playwright bridge's drainPending().
 */
async function drainPending(batch: PendingAssertion[]): Promise<void> {
  const settled = await Promise.allSettled(batch);
  const firstReject = settled.find((s) => s.status === "rejected");
  if (firstReject && firstReject.status === "rejected") {
    throw firstReject.reason instanceof Error
      ? firstReject.reason
      : new Error(String(firstReject.reason));
  }
}

function formatError(err: unknown): string {
  if (err instanceof AssertionError) return err.message;
  if (err instanceof Error) {
    // Strip the noisy internal stack frames; keep the user-facing message.
    const firstFrame = err.stack?.split("\n").slice(1, 3).join("\n") ?? "";
    return `${err.name}: ${err.message}${firstFrame ? `\n${firstFrame}` : ""}`;
  }
  return String(err);
}

/**
 * Compile and run a snippet against `root`. Snippets may register cases with
 * `test(name, fn)` / `it(...)`; a snippet with no registrations is run as one
 * implicit "snippet" case so bare assertions still work.
 */
export async function runSnippet(
  code: string,
  root: ParentNode = document.body,
  options: RunnerOptions = {}
): Promise<RunOutcome> {
  const ranAt = Date.now();
  const registered: RegisteredTest[] = [];
  const topLevelLogs: string[] = [];

  const test = (name: string, fn: () => void | Promise<void>) => {
    registered.push({ name, fn });
  };

  // Query root starts at the live page and swaps to the navigated iframe document
  // once page.goto() loads a same-origin route. Created lazily so snippets that
  // never navigate don't pay for an iframe.
  let currentRoot: ParentNode = root;
  const getRoot = () => currentRoot;
  let iframe: IframeSession | null = null;
  const ensureIframe = (): IframeSession => {
    if (!iframe) iframe = createIframeSession();
    return iframe;
  };
  // Access through a typed function at cleanup time: navigation happens inside
  // an async callback, which TypeScript's local control-flow analysis cannot
  // see as a mutation of `iframe`.
  const activeIframe = (): IframeSession | null => iframe;

  const screen = makeScreen(getRoot, options);

  // Per-test log capture is swapped in around each run; top-level logs land here.
  let logSink = topLevelLogs;
  // Per-test screenshot sink, swapped around each run like logSink.
  let screenshotSink: ScreenshotAttachment[] = [];
  const capturingConsole = {
    log: (...args: unknown[]) => logSink.push(args.map((a) => (typeof a === "string" ? a : describe(a))).join(" ")),
    info: (...args: unknown[]) => logSink.push(args.map((a) => (typeof a === "string" ? a : describe(a))).join(" ")),
    warn: (...args: unknown[]) => logSink.push("⚠ " + args.map((a) => (typeof a === "string" ? a : describe(a))).join(" ")),
    error: (...args: unknown[]) => logSink.push("✖ " + args.map((a) => (typeof a === "string" ? a : describe(a))).join(" ")),
  };
  // Notices (e.g. screenshot-skipped) land in the active test's log sink so they
  // show as a "Show logs" notice, not a failure. Reads logSink lazily so it
  // follows the per-test swap.
  const page = makePage({
    getRoot,
    options,
    notify: (message) => logSink.push(message),
    navigate: options.enableNavigation
      ? async (url: string) => {
          const session = ensureIframe();
          await session.goto(url);
          currentRoot = session.doc().body;
        }
      : undefined,
    capture: options.enableNavigation
      ? async () => ensureIframe().screenshot()
      : undefined,
    onScreenshot: (shot) => screenshotSink.push(shot),
  });

  const api = {
    expect: (actual: unknown) => makeExpect(actual),
    test,
    it: test,
    page,
    screen,
    document: root.ownerDocument ?? document,
    console: capturingConsole,
    waitFor: async (fn: () => void, opts?: { timeout?: number; interval?: number }) => {
      const timeout = opts?.timeout ?? 1000;
      const interval = opts?.interval ?? 50;
      const deadline = Date.now() + timeout;
      // Retry the callback until it stops throwing or the deadline passes.
      for (;;) {
        try {
          fn();
          return;
        } catch (e) {
          if (Date.now() >= deadline) throw e;
          await new Promise((r) => setTimeout(r, interval));
        }
      }
    },
  };

  const argNames = Object.keys(api);
  const argValues = Object.values(api);

  // Compile first so a syntax error is reported as a single failed "compile"
  // case rather than throwing out of the runner.
  let compiled: (...args: unknown[]) => Promise<unknown>;
  try {
    // Dynamic compilation is intentional here: this is the snippet evaluator
    // (the whole point of the in-page runner), guarded behind the dev-only mount.
    const AsyncFn = Object.getPrototypeOf(async () => {}).constructor;
    compiled = new AsyncFn(...argNames, `"use strict";\n${code}`) as typeof compiled;
  } catch (err) {
    const durationMs = Date.now() - ranAt;
    return {
      results: [{ name: "compile", status: "failed", durationMs: 0, error: formatError(err), logs: [] }],
      total: 1,
      passed: 0,
      failed: 1,
      durationMs,
      ranAt,
    };
  }

  const results: AssertionResult[] = [];
  const restoreCookies = seedInPageCookies(options.cookies);
  try {
    // Execute the snippet body (registers tests / runs bare asserts). pendingSink
    // collects un-awaited web-first assertions; screenshotSink collects captures.
    let topLevelError: string | undefined;
    const bodyScreenshots: ScreenshotAttachment[] = [];
    screenshotSink = bodyScreenshots;
    pendingSink = [];
    try {
      const maybe = compiled(...argValues);
      if (maybe instanceof Promise) await maybe;
      // A bare snippet may have fired un-awaited assertions in its body; await
      // them so an un-awaited failure isn't a silent pass.
      if (registered.length === 0) await drainPending(pendingSink);
    } catch (err) {
      topLevelError = formatError(err);
    }

    // No explicit test() calls: treat the whole snippet as one case. Its success
    // is simply "did the body throw?".
    if (registered.length === 0) {
      results.push({
        name: "snippet",
        status: topLevelError ? "failed" : "passed",
        durationMs: Date.now() - ranAt,
        error: topLevelError,
        logs: topLevelLogs.slice(),
        screenshots: bodyScreenshots.slice(),
      });
    } else {
      if (topLevelError || bodyScreenshots.length > 0) {
        results.push({
          name: "snippet body",
          status: topLevelError ? "failed" : "passed",
          durationMs: 0,
          error: topLevelError,
          logs: topLevelLogs.slice(),
          screenshots: bodyScreenshots.slice(),
        });
      }
      for (const t of registered) {
        const caseLogs: string[] = [];
        const caseScreenshots: ScreenshotAttachment[] = [];
        logSink = caseLogs;
        screenshotSink = caseScreenshots;
        pendingSink = [];
        const start = performance.now();
        try {
          const r = t.fn();
          if (r instanceof Promise) await withTimeout(r, TEST_TIMEOUT_MS);
          // Catch any web-first assertions the test body started but didn't await.
          await withTimeout(drainPending(pendingSink), TEST_TIMEOUT_MS);
          results.push({ name: t.name, status: "passed", durationMs: performance.now() - start, logs: caseLogs.slice(), screenshots: caseScreenshots.slice() });
        } catch (err) {
          results.push({ name: t.name, status: "failed", durationMs: performance.now() - start, error: formatError(err), logs: caseLogs.slice(), screenshots: caseScreenshots.slice() });
        }
      }
    }
  } finally {
    activeIframe()?.destroy();
    restoreCookies();
  }

  const passed = results.filter((r) => r.status === "passed").length;
  const failed = results.length - passed;
  return {
    results,
    total: results.length,
    passed,
    failed,
    durationMs: Date.now() - ranAt,
    ranAt,
  };
}

/** Names injected into snippet scope — surfaced in the editor status bar. */
export const RUNNER_GLOBALS = ["page", "expect", "test", "it", "console"];
