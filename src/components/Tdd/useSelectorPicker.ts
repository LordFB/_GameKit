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

/** Build the best available Playwright-style query for an element. */
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
    return {
      label: `${tag}[${testIdAttribute}="${testId}"]`,
      selector,
      snippet: `await expect(page.${selector}).toBeAttached();`,
    };
  }
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
    return {
      label: `${role} "${name}"`,
      selector,
      snippet: `await expect(page.${selector}).toBeVisible();`,
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
    return {
      label: role,
      selector,
      snippet: `await expect(page.${selector}).toBeAttached();`,
    };
  }
  // Last resort: a CSS selector via document.querySelector.
  const css = el.className && typeof el.className === "string" ? `${tag}.${escapeIdent(el.className.trim().split(/\s+/)[0])}` : tag;
  return locatorPicked(css, css);
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
