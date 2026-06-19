/* Static completion data for the snippet editor.

   These definitions never change between keystrokes, so they live at module
   scope. `buildSuggestions()` only stitches the per-request `range` onto each
   pre-shaped item — the previous implementation rebuilt ~30 objects (with
   markdown docs) on every completion request. */

import type { MonacoApi, CompletionRange } from "./types";

export const MONACO_SNIPPETS: Array<{
  label: string;
  insertText: string;
  description: string;
  doc: string;
}> = [
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

/** API-symbol completions (page, expect, getByRole, …). `kind` is resolved from
 *  the live Monaco API at registration time since the numeric enum lives there. */
const API_SUGGESTIONS: Array<{
  label: string;
  detail: string;
  kind: keyof MonacoApi["languages"]["CompletionItemKind"];
  doc: string;
}> = [
  {
    label: "page",
    detail: "Playwright page global",
    kind: "Variable",
    doc: "Main browser page object. In bridge mode it is a real Playwright Page; in local mode it provides locator-compatible helpers only.",
  },
  {
    label: "expect",
    detail: "Playwright expect assertion",
    kind: "Function",
    doc: "Wrap a locator, page, or primitive value and call a matcher like `toBeVisible()` or `toHaveText()`.",
  },
  {
    label: "test",
    detail: "Register a test case",
    kind: "Function",
    doc: "Registers a named test. The toolkit reports each registered test as a separate result row.",
  },
  {
    label: "getByRole",
    detail: "Locate by ARIA role",
    kind: "Method",
    doc: 'Preferred locator for user-facing elements. Example: `page.getByRole("button", { name: /save/i })`.',
  },
  {
    label: "getByText",
    detail: "Locate by visible text",
    kind: "Method",
    doc: "Finds text content. Good for status messages and headings when role is not enough.",
  },
  {
    label: "getByTestId",
    detail: "Locate by configured test-id attribute",
    kind: "Method",
    doc: "Stable fallback when semantic locators are hard to express. The attribute is configured in the TDD dashboard.",
  },
  {
    label: "getByLabel",
    detail: "Locate form control by label",
    kind: "Method",
    doc: 'Finds inputs by their accessible label. Example: `page.getByLabel("Email")`.',
  },
  {
    label: "locator",
    detail: "Locate by CSS selector",
    kind: "Method",
    doc: "CSS selector fallback. Prefer role/text/label locators when possible.",
  },
  {
    label: "screenshot",
    detail: "Capture and attach screenshot",
    kind: "Method",
    doc: 'Bridge-only. `await page.screenshot({ path: "screenshots/home.png" })` attaches the PNG to the test output.',
  },
  {
    label: "toBeVisible",
    detail: "Assert visible",
    kind: "Method",
    doc: "Web-first assertion. Waits until the locator is visible or times out.",
  },
  {
    label: "toBeAttached",
    detail: "Assert attached to DOM",
    kind: "Method",
    doc: "Checks that the element exists in the document, visible or not.",
  },
  {
    label: "toHaveText",
    detail: "Assert text",
    kind: "Method",
    doc: "Checks locator text. Supports strings and regular expressions.",
  },
  {
    label: "toHaveScreenshot",
    detail: "Assert screenshot snapshot",
    kind: "Method",
    doc: "For exported Playwright tests. Compares the page or locator against a stored snapshot.",
  },
];

/** TypeScript ambient declarations describing the injected globals, fed to
 *  Monaco's TS worker so the editor type-checks `page`/`expect`/`test`. */
export const TDD_GLOBALS_DTS = `type Role = "button" | "link" | "heading" | "textbox" | "checkbox" | "img" | "list" | "listitem" | string;
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
declare const console: Console;`;

/** Build the suggestion list for one completion request: the only per-call work
 *  is attaching `range` to each pre-computed item. */
export function buildSuggestions(monaco: MonacoApi, range: CompletionRange) {
  const snippetSuggestions = MONACO_SNIPPETS.map((snippet) => ({
    label: snippet.label,
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: snippet.insertText,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: {
      value: `**${snippet.label}**\n\n${snippet.doc}\n\n\`\`\`ts\n${snippet.insertText.replace(
        /\$\{\d+:([^}]+)\}/g,
        "$1"
      )}\n\`\`\``,
    },
    detail: snippet.description,
    range,
  }));

  const apiSuggestions = API_SUGGESTIONS.map(({ label, detail, kind, doc }) => ({
    label,
    kind: monaco.languages.CompletionItemKind[kind],
    insertText: label,
    detail,
    documentation: { value: `**${label}**\n\n${doc}` },
    range,
  }));

  return [...snippetSuggestions, ...apiSuggestions];
}
