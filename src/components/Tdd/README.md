# TDD Toolkit — a dev-only, drop-in TDD overlay for Next.js

A Storybook-like floating panel for writing, running, and exporting page tests
while looking at the page. It renders `null` outside development (it is
effectively an eval console), so it never ships enabled to production.

## Drop it into any Next.js (App Router) project

From the **target project's root**:

```bash
node path/to/Tdd/scripts/init.mjs init
# or, once published:  npx @you/tdd-toolkit init
```

This is idempotent and does three things:

1. Copies the component folder → `src/components/Tdd` (or `components/Tdd` if the
   project keeps `app/` at the root).
2. Scaffolds three dev-only routes → `app/__tdd/{run,screenshot,snippets}/route.ts`,
   each a one-line re-export of the handler that lives in `Tdd/server/`.
3. Prints the remaining manual steps and the exact (optional) install commands.

Flags: `--alias @` (import alias, default `@`), `--src-dir <dir>` (force the
source root), `--yes` (overwrite existing files).

Then mount the overlay once, in your root layout:

```tsx
import { TddToolkit } from "@/components/Tdd";
// …inside <body>:
<TddToolkit />
```

## The dependency story — why nothing is installed *by* the component

A React component cannot (and must not) install npm packages. This toolkit is
built so it doesn't need to:

| Capability                     | Dependency                       | How it's resolved                                                                 |
| ------------------------------ | -------------------------------- | --------------------------------------------------------------------------------- |
| The whole UI + in-page runner  | **none** (only `react`)          | Works with zero installs.                                                          |
| Code editor (Monaco)           | `monaco-editor` (optional)       | Vendored into `public/monaco/vs` by `scripts/copy-monaco.mjs` (a `postinstall`). Falls back to a CDN if not vendored. |
| Playwright bridge + screenshots| `playwright`, `@playwright/test` (optional) | `await import()`-ed lazily inside `*.server.ts`; if missing, the Results panel shows a friendly install hint instead of crashing. |

So a fresh drop-in **works immediately** with just the in-page runner. The two
optional capabilities light up only if you choose to install their packages:

```bash
# Local code editor (otherwise it loads Monaco from a CDN):
npm i monaco-editor
node components/Tdd/scripts/copy-monaco.mjs   # vendor it into public/ for offline use

# Real-browser automation runner + visual diff (otherwise the in-page runner is used):
npm i -D playwright @playwright/test
npx playwright install chromium
```

`copy-monaco.mjs` runs automatically on `npm install` via the `postinstall`
hook and is a no-op if `monaco-editor` isn't installed, so it never breaks an
install that doesn't want the editor.

## Layout

```
Tdd/
  TddToolkit.tsx          orchestrator (UI)
  components.tsx          presentational pieces + modals
  state.ts hooks.ts       reducers + focus-trap/clipboard hooks
  storage.ts              localStorage persistence (drop-in to /__tdd/snippets)
  testRunner.ts           in-page DOM runner (zero deps)
  bridge.ts               client → /__tdd/* fetch layer
  visualDiff.ts           non-blocking perceptual screenshot diff
  useSelectorPicker.ts    click-to-insert selector picker
  monaco/                 CDN/local editor loader, types, completions, editor
  server/                 the three route handlers (re-exported by app/__tdd/*)
  playwrightRunner.server.ts / screenshotRunner.server.ts   Node-only runners
  scripts/
    copy-monaco.mjs       vendor Monaco into public/ (postinstall)
    init.mjs              the drop-in installer (not copied into target projects)
```

## Security boundary

Everything dev-gates twice: the UI returns `null` unless `NODE_ENV ===
"development"` (or an explicit `enabled` prop), and every `__tdd` route hard-404s
outside development. The routes execute arbitrary code in a Node-launched
browser and touch the filesystem — **never enable them in production.**
