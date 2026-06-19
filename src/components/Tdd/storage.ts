/* ============================================================================
   Snippet persistence
   ----------------------------------------------------------------------------
   "Simple mode" from the concept: snippets live in localStorage under
   `next-tdd-snippets`. Every call is SSR-safe (guards `window`) and degrades to
   an in-memory list if storage is unavailable (private mode, quota, etc.).

   The shape is intentionally backend-agnostic: swapping these functions for
   fetch() against `POST/GET/DELETE /__tdd/snippets` ("serious mode") is a
   drop-in change — the toolkit never touches `localStorage` directly.
   ========================================================================== */

export interface Snippet {
  id: string;
  name: string;
  description?: string;
  code: string;
  createdAt: number;
  updatedAt: number;
}

const KEY = "next-tdd-snippets";
const SETTINGS_KEY = "next-tdd-settings";

export interface TddSettings {
  testIdAttribute: string;
}

export const DEFAULT_TDD_SETTINGS: TddSettings = {
  testIdAttribute: "data-test",
};

function uid(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function available(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    const s = window.localStorage;
    const probe = "__tdd_probe__";
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

const SEED: Array<Omit<Snippet, "id" | "createdAt" | "updatedAt">> = [
  {
    name: "Homepage renders actions",
    description: "Main heading + primary action are present and visible",
    code: `// Assert the current page is rendered.
// Injected globals: page, expect, test, it, console

test("main heading is visible", async () => {
  await expect(page.getByRole("heading", { name: /game toolkit ui components/i })).toBeVisible();
});

test("primary action is present", async () => {
  const cta = page.getByRole("button", { name: "Play Now" });
  await expect(cta).toBeAttached();
  await expect(cta).not.toBeDisabled();
});`,
  },
  {
    name: "Theme toggle",
    description: "The page exposes the theme switch button",
    code: `test("theme toggle is available", async () => {
  await expect(page.getByRole("button", { name: /switch to .* theme/i })).toBeVisible();
});`,
  },
  {
    name: "Playwright: page loads",
    description: "Switch the runner to “Playwright bridge” to run this",
    code: `// Real automation — needs the Playwright bridge runner (concept §2).
// Injected globals: page, expect, test, it, context, console

test("home page renders a heading", async () => {
  await page.goto("/");
  await expect(page.getByRole("heading").first()).toBeVisible();
});

test("page has a non-empty title", async () => {
  await expect(page).toHaveTitle(/.+/);
});`,
  },
];

function migrateSnippet(snippet: Snippet): Snippet {
  if (
    snippet.name === "Homepage renders CTA" &&
    snippet.code.includes("Shop now")
  ) {
    return {
      ...snippet,
      name: "Homepage renders actions",
      description: "Main heading + primary action are present and visible",
      code: SEED[0].code,
      updatedAt: Date.now(),
    };
  }

  if (
    snippet.name === "Nav links" &&
    snippet.code.includes("products")
  ) {
    return {
      ...snippet,
      name: "Theme toggle",
      description: "The page exposes the theme switch button",
      code: SEED[1].code,
      updatedAt: Date.now(),
    };
  }

  return snippet;
}

function migrateSnippets(snippets: Snippet[]): Snippet[] {
  return snippets.map(migrateSnippet);
}

function seed(): Snippet[] {
  const now = Date.now();
  return SEED.map((s, i) => ({
    ...s,
    id: uid(),
    createdAt: now - (SEED.length - i) * 1000,
    updatedAt: now - (SEED.length - i) * 1000,
  }));
}

export function loadSnippets(): Snippet[] {
  const store = available();
  if (!store) return seed();
  const raw = store.getItem(KEY);
  if (!raw) {
    const seeded = seed();
    saveSnippets(seeded);
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((s) => s && typeof s.id === "string" && typeof s.code === "string")) {
      const migrated = migrateSnippets(parsed as Snippet[]);
      if (JSON.stringify(migrated) !== JSON.stringify(parsed)) saveSnippets(migrated);
      return migrated;
    }
  } catch {
    // fall through to a fresh seed on corrupt data
  }
  const seeded = seed();
  saveSnippets(seeded);
  return seeded;
}

export function saveSnippets(snippets: Snippet[]): void {
  const store = available();
  if (!store) return;
  try {
    store.setItem(KEY, JSON.stringify(snippets));
  } catch {
    // quota or serialization failure — keep working from memory this session
  }
}

export function normalizeTestIdAttribute(value: string): string {
  const attr = value.trim() || DEFAULT_TDD_SETTINGS.testIdAttribute;
  return /^[A-Za-z_][A-Za-z0-9_.:-]*$/.test(attr)
    ? attr
    : DEFAULT_TDD_SETTINGS.testIdAttribute;
}

export function loadSettings(): TddSettings {
  const store = available();
  if (!store) return DEFAULT_TDD_SETTINGS;
  const raw = store.getItem(SETTINGS_KEY);
  if (!raw) return DEFAULT_TDD_SETTINGS;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return {
        testIdAttribute: normalizeTestIdAttribute(
          typeof parsed.testIdAttribute === "string"
            ? parsed.testIdAttribute
            : DEFAULT_TDD_SETTINGS.testIdAttribute
        ),
      };
    }
  } catch {
    /* use defaults */
  }
  return DEFAULT_TDD_SETTINGS;
}

export function saveSettings(settings: TddSettings): void {
  const store = available();
  if (!store) return;
  try {
    store.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        testIdAttribute: normalizeTestIdAttribute(settings.testIdAttribute),
      })
    );
  } catch {
    // quota or serialization failure: keep working from memory this session
  }
}

export function createSnippet(name = "Untitled test"): Snippet {
  const now = Date.now();
  return {
    id: uid(),
    name,
    description: "",
    code: `test("it works", async () => {\n  await expect(page.locator("body")).toBeVisible();\n});\n`,
    createdAt: now,
    updatedAt: now,
  };
}

export function duplicateSnippet(source: Snippet): Snippet {
  const now = Date.now();
  return {
    ...source,
    id: uid(),
    name: `${source.name} copy`,
    createdAt: now,
    updatedAt: now,
  };
}
