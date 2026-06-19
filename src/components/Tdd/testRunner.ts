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

export interface RunOutcome {
  results: AssertionResult[];
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  ranAt: number;
}

export interface RunnerOptions {
  testIdAttribute?: string;
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
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.hidden) return false;
  const style = el.ownerDocument.defaultView?.getComputedStyle(el);
  if (style) {
    if (style.display === "none") return false;
    if (style.visibility === "hidden" || style.visibility === "collapse") return false;
    if (Number(style.opacity) === 0) return false;
  }
  // offsetParent is null for display:none or fixed-position-in-hidden subtrees.
  return el.offsetParent !== null || el.getClientRects().length > 0;
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

interface Matchers {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toBeNull(): void;
  toBeDefined(): void;
  toContain(substring: string): void;
  toHaveText(text: string | RegExp): void;
  toHaveTextContent(text: string | RegExp): void;
  toHaveAttribute(name: string, value?: string | RegExp): void;
  toHaveTitle(text: string | RegExp): void;
  toBeVisible(): void;
  toBeAttached(): void;
  toBeInTheDocument(): void;
  toBeDisabled(): void;
  toBeChecked(): void;
}

function makeExpect(actual: unknown, negated = false): Matchers & { not: Matchers } {
  const check = (pass: boolean, message: string) => {
    if (pass === negated) {
      throw new AssertionError(negated ? `Expected NOT: ${message}` : message);
    }
  };
  const el = actual instanceof Element ? actual : isInPageLocator(actual) ? actual.resolveOne() : null;
  const textMatches = (value: string, expected: string | RegExp) =>
    expected instanceof RegExp ? expected.test(value) : value.includes(expected);

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
      const content = el?.textContent ?? "";
      check(textMatches(content, text), `expected element to have text ${describe(text)}, got ${describe(content.trim())}`);
    },
    toHaveTextContent(text) {
      const content = el?.textContent ?? "";
      check(textMatches(content, text), `expected element to have text ${describe(text)}, got ${describe(content.trim())}`);
    },
    toHaveAttribute(name, value) {
      const has = el?.hasAttribute(name) ?? false;
      if (value === undefined) {
        check(has, `expected element to have attribute "${name}"`);
      } else {
        const actualValue = el?.getAttribute(name) ?? "";
        const ok = value instanceof RegExp ? value.test(actualValue) : actualValue === value;
        check(ok, `expected attribute "${name}" to be ${describe(value)}, got ${describe(actualValue)}`);
      }
    },
    toHaveTitle(text) {
      const title = actual && typeof actual === "object" && "title" in actual && typeof actual.title === "function"
        ? String(actual.title())
        : "";
      check(textMatches(title, text), `expected page title to match ${describe(text)}, got ${describe(title)}`);
    },
    toBeVisible() {
      check(isVisible(el), `expected ${describe(actual)} to be visible`);
    },
    toBeAttached() {
      check(Boolean(el && el.ownerDocument.contains(el)), `expected element to be attached`);
    },
    toBeInTheDocument() {
      check(Boolean(el && el.ownerDocument.contains(el)), `expected element to be in the document`);
    },
    toBeDisabled() {
      const disabled = el instanceof HTMLButtonElement || el instanceof HTMLInputElement ? el.disabled : el?.getAttribute("aria-disabled") === "true";
      check(Boolean(disabled), `expected element to be disabled`);
    },
    toBeChecked() {
      const checked = el instanceof HTMLInputElement ? el.checked : el?.getAttribute("aria-checked") === "true";
      check(Boolean(checked), `expected element to be checked`);
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

function makeScreen(root: ParentNode, options: RunnerOptions = {}) {
  const testIdAttribute = normalizeTestIdAttribute(options.testIdAttribute);
  const byText = (text: string | RegExp): Element[] => {
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
    let els = Array.from(root.querySelectorAll(selector));
    if (options?.name !== undefined) {
      els = els.filter((el) => nameMatches(accessibleName(el), options.name!));
    }
    return els;
  };

  const byTestId = (id: string): Element[] =>
    Array.from(root.querySelectorAll(`[${testIdAttribute}="${escapeAttrValue(id)}"]`));

  const byLabelText = (text: string | RegExp): Element[] => {
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

function makePage(root: ParentNode, options: RunnerOptions = {}) {
  const screen = makeScreen(root, options);
  const doc = root.ownerDocument ?? document;

  const queryAll = (selector: string): Element[] => {
    const self = root instanceof Element && (root.matches(selector) || selector === "body") ? [root] : [];
    return [...self, ...Array.from(root.querySelectorAll(selector))];
  };

  const byPlaceholder = (text: string | RegExp): Element[] => {
    const els = queryAll("[placeholder]");
    return els.filter((el) => nameMatches(el.getAttribute("placeholder") ?? "", text));
  };

  return {
    goto: async () => {},
    waitForLoadState: async () => {},
    screenshot: async () => {
      throw new AssertionError("page.screenshot() requires the Playwright bridge. Switch Runner / Execution Mode to Playwright bridge.");
    },
    title: () => doc.title,
    url: () => doc.location?.href ?? "",
    locator: (selector: string) =>
      makeLocator(root, () => queryAll(selector), `page.locator(${JSON.stringify(selector)})`),
    getByRole: (role: string, options?: { name?: string | RegExp }) =>
      makeLocator(root, () => screen.getAllByRole(role, options), `page.getByRole(${JSON.stringify(role)})`),
    getByText: (text: string | RegExp) =>
      makeLocator(root, () => screen.getAllByText(text), `page.getByText(${describe(text)})`),
    getByTestId: (id: string) =>
      makeLocator(root, () => screen.getAllByTestId(id), `page.getByTestId(${JSON.stringify(id)})`),
    getByLabel: (text: string | RegExp) =>
      makeLocator(root, () => screen.getAllByLabelText(text), `page.getByLabel(${describe(text)})`),
    getByLabelText: (text: string | RegExp) =>
      makeLocator(root, () => screen.getAllByLabelText(text), `page.getByLabelText(${describe(text)})`),
    getByPlaceholder: (text: string | RegExp) =>
      makeLocator(root, () => byPlaceholder(text), `page.getByPlaceholder(${describe(text)})`),
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
  const screen = makeScreen(root, options);
  const page = makePage(root, options);

  // Per-test log capture is swapped in around each run; top-level logs land here.
  let logSink = topLevelLogs;
  const capturingConsole = {
    log: (...args: unknown[]) => logSink.push(args.map((a) => (typeof a === "string" ? a : describe(a))).join(" ")),
    info: (...args: unknown[]) => logSink.push(args.map((a) => (typeof a === "string" ? a : describe(a))).join(" ")),
    warn: (...args: unknown[]) => logSink.push("⚠ " + args.map((a) => (typeof a === "string" ? a : describe(a))).join(" ")),
    error: (...args: unknown[]) => logSink.push("✖ " + args.map((a) => (typeof a === "string" ? a : describe(a))).join(" ")),
  };

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

  // Execute the snippet body (this is what registers tests / runs bare asserts).
  let topLevelError: string | undefined;
  try {
    const maybe = compiled(...argValues);
    if (maybe instanceof Promise) await maybe;
  } catch (err) {
    topLevelError = formatError(err);
  }

  const results: AssertionResult[] = [];

  // No explicit test() calls: treat the whole snippet as one case. Its success
  // is simply "did the body throw?".
  if (registered.length === 0) {
    results.push({
      name: "snippet",
      status: topLevelError ? "failed" : "passed",
      durationMs: Date.now() - ranAt,
      error: topLevelError,
      logs: topLevelLogs.slice(),
    });
  } else {
    if (topLevelError) {
      results.push({ name: "snippet body", status: "failed", durationMs: 0, error: topLevelError, logs: topLevelLogs.slice() });
    }
    for (const t of registered) {
      const caseLogs: string[] = [];
      logSink = caseLogs;
      const start = performance.now();
      try {
        const r = t.fn();
        if (r instanceof Promise) await withTimeout(r, TEST_TIMEOUT_MS);
        results.push({ name: t.name, status: "passed", durationMs: performance.now() - start, logs: caseLogs.slice() });
      } catch (err) {
        results.push({ name: t.name, status: "failed", durationMs: performance.now() - start, error: formatError(err), logs: caseLogs.slice() });
      }
    }
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
