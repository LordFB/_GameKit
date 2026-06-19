/* Loads the Monaco editor from a CDN exactly once per page. The loader script
   and the AMD `require(["vs/editor/editor.main"])` step are both cached behind
   `window.__tddMonacoLoader` so concurrent editors share a single download. */

import type { MonacoApi } from "./types";

export const MONACO_CDN = "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs";

export function loadMonaco(): Promise<MonacoApi> {
  if (typeof window === "undefined") return Promise.reject(new Error("Monaco is client-only."));
  if (window.monaco) return Promise.resolve(window.monaco);
  if (window.__tddMonacoLoader) return window.__tddMonacoLoader;

  window.__tddMonacoLoader = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-tdd-monaco-loader="true"]'
    );
    const script = existing ?? document.createElement("script");
    script.dataset.tddMonacoLoader = "true";
    script.src = `${MONACO_CDN}/loader.js`;
    script.async = true;
    script.onload = () => {
      window.require?.config({ paths: { vs: MONACO_CDN } });
      window.require?.(["vs/editor/editor.main"], () => {
        if (window.monaco) resolve(window.monaco);
        else reject(new Error("Monaco loaded but did not expose window.monaco."));
      });
    };
    script.onerror = () => reject(new Error("Could not load Monaco from the CDN."));
    if (!existing) document.head.appendChild(script);
  });

  return window.__tddMonacoLoader;
}
