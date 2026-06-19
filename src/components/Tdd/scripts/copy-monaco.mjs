#!/usr/bin/env node
/* ============================================================================
   copy-monaco.mjs — vendor the Monaco editor into public/ for offline use
   ----------------------------------------------------------------------------
   The TDD Toolkit's editor used to load from a CDN (jsdelivr). To make the
   toolkit work air-gapped / offline and removed-from-the-network, we instead
   serve Monaco's prebuilt AMD bundle from the app itself.

   This copies `node_modules/monaco-editor/min/vs` → `public/monaco/vs`, which
   `monaco/loader.ts` then loads from `/monaco/vs` exactly the way it used to
   load from the CDN. We only copy `min/vs` (the runtime), not the whole
   package, so the footprint stays small (~5 MB).

   It runs as a `postinstall` step, so it must DEGRADE GRACEFULLY:
   - if monaco-editor isn't installed → no-op (a consumer who only wants the
     in-page runner never installed it; that's fine);
   - if the copy already exists and is up to date → skip;
   - never throw in a way that fails `npm install`.
   ========================================================================== */

import { createRequire } from "node:module";
import { cp, mkdir, readFile, rm, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import process from "node:process";

const require = createRequire(import.meta.url);

/** Resolve the installed monaco-editor package dir, or null if absent. */
function resolveMonacoDir() {
  try {
    // Resolve via the package's own entry so we work regardless of hoisting.
    const pkgJson = require.resolve("monaco-editor/package.json");
    return path.dirname(pkgJson);
  } catch {
    return null;
  }
}

async function exists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const monacoDir = resolveMonacoDir();
  if (!monacoDir) {
    // No Monaco installed → the editor will fall back to the CDN loader, and
    // the in-page runner works regardless. Nothing to vendor.
    return;
  }

  const src = path.join(monacoDir, "min", "vs");
  if (!(await exists(src))) {
    console.warn(`[tdd] monaco-editor found but ${src} is missing; skipping vendor copy.`);
    return;
  }

  // public/ lives at the project root. process.cwd() is the project root for
  // both `npm install` postinstall and `npm run tdd:monaco`.
  const destRoot = path.join(process.cwd(), "public", "monaco");
  const dest = path.join(destRoot, "vs");
  const stamp = path.join(destRoot, ".monaco-version");

  // Skip the copy if the vendored version already matches the installed one.
  let installedVersion = "unknown";
  try {
    const pkg = JSON.parse(await readFile(path.join(monacoDir, "package.json"), "utf8"));
    installedVersion = pkg.version ?? "unknown";
  } catch {
    /* keep "unknown" */
  }
  if (await exists(stamp)) {
    const current = (await readFile(stamp, "utf8")).trim();
    if (current === installedVersion && (await exists(dest))) {
      return; // already up to date
    }
  }

  await rm(dest, { recursive: true, force: true });
  await mkdir(destRoot, { recursive: true });
  await cp(src, dest, { recursive: true });
  await writeFile(stamp, installedVersion + "\n", "utf8");
  console.log(`[tdd] Vendored monaco-editor@${installedVersion} → public/monaco/vs`);
}

main().catch((err) => {
  // Never fail the install over the editor; the CDN fallback still works.
  console.warn(`[tdd] Could not vendor Monaco (editor will use the CDN fallback): ${err?.message ?? err}`);
});
