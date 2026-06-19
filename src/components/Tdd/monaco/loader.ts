/* Loads the Monaco editor exactly once per page. The loader script and the AMD
   `require(["vs/editor/editor.main"])` step are both cached behind
   `window.__tddMonacoLoader` so concurrent editors share a single download.

   Monaco is served from the app itself at `/monaco/vs` (vendored into `public/`
   by `scripts/copy-monaco.mjs`, which runs on `postinstall`). This keeps the
   toolkit working offline / air-gapped. If the local copy isn't present — e.g.
   `monaco-editor` was never installed — we fall back to the jsdelivr CDN so the
   editor still works without an install step. */

import type { MonacoApi } from "./types";

/** Local, vendored Monaco (preferred). Served from public/monaco/vs. */
export const MONACO_LOCAL = "/monaco/vs";
/** Network fallback used only when the local copy is missing. */
export const MONACO_CDN = "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs";

/** Resolve which Monaco base URL to use: local if vendored, else the CDN. */
async function resolveMonacoBase(): Promise<string> {
  try {
    // A HEAD against the vendored loader tells us whether `public/monaco` exists
    // without downloading the bundle. Any non-2xx (404 in a project that didn't
    // vendor Monaco) sends us to the CDN.
    const res = await fetch(`${MONACO_LOCAL}/loader.js`, { method: "HEAD" });
    if (res.ok) return MONACO_LOCAL;
  } catch {
    /* network/offline — fall through to the CDN attempt below */
  }
  return MONACO_CDN;
}

/* Monaco runs its language services in web workers loaded via AMD. A worker
   started from a relative path can't resolve `vs/...` against the page, so we
   give it a proxy worker (a blob) that pins the absolute base URL and then
   importScripts the real worker entry. This is the standard way to run Monaco's
   prebuilt min/vs bundle without a bundler, and works for both the local
   (/monaco/vs) and CDN bases. */
function installWorkerEnvironment(base: string): void {
  // `base` points at the `vs` dir (…/monaco/vs). Inside the worker, Monaco's AMD
  // loader resolves module ids like `vs/language/typescript/tsWorker` against
  // `baseUrl`, so `baseUrl` must be the PARENT of `vs` (…/monaco/) — otherwise it
  // builds …/monaco/vs/vs/… and 404s.
  const absoluteVs = new URL(base, window.location.href).href.replace(/\/$/, "");
  const absoluteParent = absoluteVs.replace(/\/vs$/, "") + "/";
  window.MonacoEnvironment = {
    getWorkerUrl() {
      const proxy = `self.MonacoEnvironment = { baseUrl: ${JSON.stringify(
        absoluteParent
      )} };\nimportScripts(${JSON.stringify(absoluteVs + "/base/worker/workerMain.js")});`;
      return URL.createObjectURL(new Blob([proxy], { type: "text/javascript" }));
    },
  };
}

export function loadMonaco(): Promise<MonacoApi> {
  if (typeof window === "undefined") return Promise.reject(new Error("Monaco is client-only."));
  if (window.monaco) return Promise.resolve(window.monaco);
  if (window.__tddMonacoLoader) return window.__tddMonacoLoader;

  window.__tddMonacoLoader = (async () => {
    const base = await resolveMonacoBase();
    installWorkerEnvironment(base);
    return new Promise<MonacoApi>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[data-tdd-monaco-loader="true"]'
      );
      const script = existing ?? document.createElement("script");
      script.dataset.tddMonacoLoader = "true";
      script.src = `${base}/loader.js`;
      script.async = true;
      script.onload = () => {
        window.require?.config({ paths: { vs: base } });
        window.require?.(["vs/editor/editor.main"], () => {
          if (window.monaco) resolve(window.monaco);
          else reject(new Error("Monaco loaded but did not expose window.monaco."));
        });
      };
      script.onerror = () =>
        reject(new Error(`Could not load Monaco from ${base}.`));
      if (!existing) document.head.appendChild(script);
    });
  })();

  return window.__tddMonacoLoader;
}
