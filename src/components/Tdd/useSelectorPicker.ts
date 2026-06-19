/* ============================================================================
   Selector picker — the "killer feature" (concept §Killer feature)
   ----------------------------------------------------------------------------
   Arms a crosshair over the page; on click it captures the target element,
   derives the best Playwright-style selector for it, and returns a ready-to-
   paste assertion. Escape cancels. While armed, a highlight box + tag track the
   element under the cursor.

   Elements inside the toolkit itself (data-tdd-ui) are ignored so the user
   can't accidentally pick the picker.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from "react";

export interface PickedElement {
  /** A human label for the element, e.g. `button "Submit"`. */
  label: string;
  /** The assertion snippet to insert, e.g. page.getByRole(...) line. */
  snippet: string;
  /** A short selector description shown in the panel. */
  selector: string;
}

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function escapeAttrValue(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\A ");
}

function escapeIdent(s: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(s);
  return s.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function locatorPicked(label: string, selector: string): PickedElement {
  return {
    label,
    selector: `locator("${escapeText(selector)}")`,
    snippet: `await expect(page.locator("${escapeText(selector)}")).toBeAttached();`,
  };
}

function accessibleName(el: Element): string {
  const aria = el.getAttribute("aria-label");
  if (aria) return aria.trim();
  if (el instanceof HTMLImageElement && el.alt) return el.alt.trim();
  const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
  return text.length > 50 ? text.slice(0, 50) + "…" : text;
}

function roleOf(el: Element): string | null {
  const explicit = el.getAttribute("role");
  if (explicit) return explicit;
  const tag = el.tagName.toLowerCase();
  if (tag === "button") return "button";
  if (tag === "a" && el.hasAttribute("href")) return "link";
  if (/^h[1-6]$/.test(tag)) return "heading";
  if (tag === "input") {
    const type = (el as HTMLInputElement).type;
    if (type === "checkbox") return "checkbox";
    if (type === "radio") return "radio";
    if (["button", "submit", "reset"].includes(type)) return "button";
    return "textbox";
  }
  if (tag === "textarea") return "textbox";
  if (tag === "img") return "img";
  return null;
}

function normalizeTestIdAttribute(value?: string): string {
  const attr = value?.trim() || "data-test";
  return /^[A-Za-z_][A-Za-z0-9_.:-]*$/.test(attr) ? attr : "data-test";
}

/** Heuristic for CSS-modules / styled hashed class names like `Button_btn__a3f9x`
 *  or `css-1q2w3e` — they change on every build, so selectors built from them
 *  rot immediately. We skip these in the CSS fallback. */
function isHashedClass(name: string): boolean {
  return (
    /__[A-Za-z0-9]{5,}$/.test(name) || // CSS Modules: name__hash
    /(?:^|[-_])[a-z]?[0-9a-f]{5,}$/i.test(name) || // emotion/styled: css-1ab2c3
    /\d/.test(name.slice(-4)) // trailing digits are usually generated
  );
}

/** First non-hashed class on the element, if any. */
function stableClass(el: Element): string | null {
  if (typeof el.className !== "string") return null;
  const classes = el.className.trim().split(/\s+/).filter(Boolean);
  return classes.find((c) => !isHashedClass(c)) ?? null;
}

/** Elements matching a selector, excluding the toolkit's own UI (`data-tdd-ui`)
 *  so counts/indices reflect the page a real Playwright run would see, not the
 *  overlay. */
function queryPage(selector: string): Element[] {
  if (typeof document === "undefined") return [];
  try {
    return Array.from(document.querySelectorAll(selector)).filter(
      (el) => !el.closest("[data-tdd-ui]")
    );
  } catch {
    return [];
  }
}

/** Count how many elements a role+name query matches, and the target's index
 *  among them — used to decide whether a locator needs .first()/.nth(). */
function roleMatches(role: string, name: string): Element[] {
  const ROLE_SELECTORS: Record<string, string> = {
    button: 'button, [role="button"], input[type="button"], input[type="submit"]',
    link: 'a[href], [role="link"]',
    heading: 'h1, h2, h3, h4, h5, h6, [role="heading"]',
    textbox: 'input:not([type="hidden"]):not([type="button"]):not([type="submit"]), textarea, [role="textbox"]',
    checkbox: 'input[type="checkbox"], [role="checkbox"]',
    radio: 'input[type="radio"], [role="radio"]',
    img: 'img, [role="img"]',
  };
  const selector = ROLE_SELECTORS[role] ?? `[role="${role}"]`;
  const lower = name.toLowerCase();
  return queryPage(selector).filter((candidate) => {
    if (!name) return true;
    const actual = accessibleName(candidate).toLowerCase();
    return actual === lower || actual.includes(lower);
  });
}

/** Number of elements a CSS selector matches in the live page (0 when unavailable). */
function cssCount(selector: string): number {
  return queryPage(selector).length;
}

/** Append a chain qualifier when a selector matches more than one element, so
 *  the inserted assertion resolves to exactly the element the user picked
 *  instead of throwing "matched N elements". */
function disambiguate(snippetSelector: string, index: number, total: number): string {
  if (total <= 1 || index < 0) return snippetSelector;
  return index === 0 ? `${snippetSelector}.first()` : `${snippetSelector}.nth(${index})`;
}

/** Build the best available Playwright-style query for an element. Each
 *  candidate is checked against the live DOM for uniqueness and disambiguated
 *  with .first()/.nth(i) when it matches more than one element. */
export function describeSelector(
  el: Element,
  configuredTestIdAttribute = "data-test"
): PickedElement {
  const testIdAttribute = normalizeTestIdAttribute(configuredTestIdAttribute);
  const testId = el.getAttribute(testIdAttribute);
  const role = roleOf(el);
  const name = accessibleName(el);
  const tag = el.tagName.toLowerCase();

  if (testId) {
    const selector = `getByTestId("${escapeText(testId)}")`;
    const matches = cssCount(`[${testIdAttribute}="${escapeAttrValue(testId)}"]`);
    const index = matches > 1 ? indexAmong(`[${testIdAttribute}="${escapeAttrValue(testId)}"]`, el) : -1;
    const located = disambiguate(`page.${selector}`, index, matches);
    return {
      label: `${tag}[${testIdAttribute}="${testId}"]`,
      selector,
      snippet: `await expect(${located}).toBeAttached();`,
    };
  }
  // id is unique by definition — no disambiguation needed.
  if (el.id) {
    return locatorPicked(`${tag}#${el.id}`, `#${escapeIdent(el.id)}`);
  }
  const explicitName = el.getAttribute("name");
  if (explicitName) {
    return locatorPicked(`${tag}[name="${explicitName}"]`, `${tag}[name="${escapeAttrValue(explicitName)}"]`);
  }
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel) {
    return locatorPicked(`${tag}[aria-label="${ariaLabel}"]`, `${tag}[aria-label="${escapeAttrValue(ariaLabel)}"]`);
  }
  const title = el.getAttribute("title");
  if (title) {
    return locatorPicked(`${tag}[title="${title}"]`, `${tag}[title="${escapeAttrValue(title)}"]`);
  }
  const href = el.getAttribute("href");
  if (href) {
    return locatorPicked(`${tag}[href="${href}"]`, `${tag}[href="${escapeAttrValue(href)}"]`);
  }
  if (role && name) {
    const selector = `getByRole("${role}", { name: "${escapeText(name)}" })`;
    const matches = roleMatches(role, name);
    const index = matches.indexOf(el);
    const located = disambiguate(`page.${selector}`, index, matches.length);
    return {
      label: matches.length > 1 ? `${role} "${name}" (${index + 1}/${matches.length})` : `${role} "${name}"`,
      selector,
      snippet: `await expect(${located}).toBeVisible();`,
    };
  }
  if (name) {
    const selector = `getByText("${escapeText(name)}")`;
    return {
      label: `${tag} "${name}"`,
      selector,
      snippet: `await expect(page.${selector}).toBeVisible();`,
    };
  }
  if (role) {
    const selector = `getByRole("${role}")`;
    const matches = roleMatches(role, "");
    const index = matches.indexOf(el);
    const located = disambiguate(`page.${selector}`, index, matches.length);
    return {
      label: matches.length > 1 ? `${role} (${index + 1}/${matches.length})` : role,
      selector,
      snippet: `await expect(${located}).toBeAttached();`,
    };
  }
  // Last resort: a CSS selector. Prefer a stable (non-hashed) class; otherwise
  // fall back to a structural nth-of-type path so the selector is deterministic
  // instead of pinned to a build-specific hashed class name.
  const stable = stableClass(el);
  if (stable) {
    const css = `${tag}.${escapeIdent(stable)}`;
    const count = cssCount(css);
    const index = count > 1 ? indexAmong(css, el) : -1;
    const located = disambiguate(`page.locator("${escapeText(css)}")`, index, count);
    return {
      label: count > 1 ? `${css} (${index + 1}/${count})` : css,
      selector: `locator("${escapeText(css)}")`,
      snippet: `await expect(${located}).toBeAttached();`,
    };
  }
  const path = structuralSelector(el);
  return locatorPicked(path, path);
}

/** Index of `el` among page elements matching a CSS selector (−1 if not found). */
function indexAmong(selector: string, el: Element): number {
  return queryPage(selector).indexOf(el);
}

/** A deterministic structural selector (`main > div:nth-of-type(2) > button`),
 *  used only when nothing semantic or stable is available. Walks up at most a
 *  few levels to keep it short while staying unique. */
function structuralSelector(el: Element): string {
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && node.nodeType === Node.ELEMENT_NODE && parts.length < 5) {
    const tag = node.tagName.toLowerCase();
    if (node.id) {
      parts.unshift(`#${escapeIdent(node.id)}`);
      break;
    }
    const parent: Element | null = node.parentElement;
    if (!parent) {
      parts.unshift(tag);
      break;
    }
    const sameTag = Array.from(parent.children).filter(
      (c) => c.tagName === node!.tagName
    );
    const nth = sameTag.indexOf(node) + 1;
    parts.unshift(sameTag.length > 1 ? `${tag}:nth-of-type(${nth})` : tag);
    if (tag === "body" || tag === "main") break;
    node = parent;
  }
  return parts.join(" > ");
}

interface PickerState {
  active: boolean;
  picked: PickedElement | null;
}

export function useSelectorPicker(
  onPick?: (p: PickedElement) => void,
  testIdAttribute = "data-test"
) {
  const [state, setState] = useState<PickerState>({ active: false, picked: null });
  const boxRef = useRef<HTMLDivElement | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef(false);

  const teardown = useCallback(() => {
    activeRef.current = false;
    boxRef.current?.remove();
    tipRef.current?.remove();
    boxRef.current = null;
    tipRef.current = null;
    document.body.style.cursor = "";
  }, []);

  const stop = useCallback(() => {
    teardown();
    setState((s) => ({ ...s, active: false }));
  }, [teardown]);

  const start = useCallback(() => {
    if (typeof document === "undefined") return;
    activeRef.current = true;
    setState({ active: true, picked: null });
    document.body.style.cursor = "crosshair";

    const box = document.createElement("div");
    box.className = "tdd-pick-highlight";
    box.setAttribute("data-tdd-ui", "");
    const tip = document.createElement("div");
    tip.className = "tdd-pick-tooltip";
    tip.setAttribute("data-tdd-ui", "");
    document.body.appendChild(box);
    document.body.appendChild(tip);
    boxRef.current = box;
    tipRef.current = tip;
  }, []);

  const toggle = useCallback(() => {
    if (activeRef.current) stop();
    else start();
  }, [start, stop]);

  useEffect(() => {
    if (!state.active) return;

    const insideUi = (el: Element | null): boolean => !!el?.closest("[data-tdd-ui]");

    const onMove = (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const box = boxRef.current;
      const tip = tipRef.current;
      if (!el || !box || !tip || insideUi(el)) {
        if (box) box.style.display = "none";
        if (tip) tip.style.display = "none";
        return;
      }
      const r = el.getBoundingClientRect();
      box.style.display = "block";
      box.style.left = `${r.left}px`;
      box.style.top = `${r.top}px`;
      box.style.width = `${r.width}px`;
      box.style.height = `${r.height}px`;
      tip.style.display = "block";
      tip.style.left = `${Math.max(4, r.left)}px`;
      tip.style.top = `${Math.max(4, r.top - 24)}px`;
      tip.textContent = describeSelector(el, testIdAttribute).label;
    };

    const onClick = (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || insideUi(el)) return;
      e.preventDefault();
      e.stopPropagation();
      const picked = describeSelector(el, testIdAttribute);
      teardown();
      setState({ active: false, picked });
      onPick?.(picked);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") stop();
    };

    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [state.active, onPick, stop, teardown, testIdAttribute]);

  useEffect(() => () => teardown(), [teardown]);

  return { active: state.active, picked: state.picked, start, stop, toggle };
}
