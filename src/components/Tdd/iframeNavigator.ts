/* ============================================================================
   Same-origin iframe navigation + canvas screenshots for the in-page runner.
   ----------------------------------------------------------------------------
   The in-page runner normally tests the live tab and treats page.goto() as a
   no-op. This module lets it actually navigate: page.goto("/route") loads a
   SAME-ORIGIN route of the current app into an offscreen iframe, and the runner
   then queries / clicks / asserts against that iframe's document.

   Hard browser limits (not bugs — same-origin policy):
   - Cross-origin URLs (e.g. https://example.com) load as pixels but the parent
     CANNOT read their DOM or rasterize them. We reject those up front with a
     clear "use the Playwright bridge" message rather than letting a later DOM
     access throw an opaque SecurityError.
   - Screenshots use the SVG <foreignObject> trick, which also requires
     same-origin content (and same-origin images inside it) or the canvas taints
     and toDataURL() throws.
   ========================================================================== */

/** Hidden iframe parked offscreen so navigation doesn't disturb the page. */
export interface IframeSession {
  iframe: HTMLIFrameElement;
  /** Resolve the document to query; throws if cross-origin/inaccessible. */
  doc(): Document;
  goto(url: string): Promise<void>;
  screenshot(): Promise<{ dataUrl: string; width: number; height: number }>;
  destroy(): void;
}

const NAV_TIMEOUT_MS = 10_000;

function isCrossOrigin(url: string): boolean {
  try {
    const resolved = new URL(url, window.location.href);
    return resolved.origin !== window.location.origin;
  } catch {
    // A bare relative path that can't be parsed against the origin is, by
    // definition, same-origin once resolved — treat as same-origin.
    return false;
  }
}

/** Read the iframe document, converting the SOP SecurityError into our message. */
function readDoc(iframe: HTMLIFrameElement): Document {
  try {
    const doc = iframe.contentDocument;
    if (!doc) throw new Error("no document");
    // Touch a property to force the cross-origin trap to fire here, not later.
    void doc.location.href;
    return doc;
  } catch {
    throw new Error(
      "Cannot access the navigated page — it is cross-origin. The in-page runner " +
        "can only inspect same-origin routes of this app. Switch Runner / " +
        "Execution Mode to “Playwright bridge” to drive a real cross-origin page."
    );
  }
}

export function createIframeSession(): IframeSession {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("data-tdd-ui", "");
  iframe.setAttribute("aria-hidden", "true");
  iframe.title = "TDD in-page navigation target";
  // Park it offscreen at a realistic viewport so layout/visibility behave like a
  // real page, without it being visible or interactive over the toolkit.
  Object.assign(iframe.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: "1280px",
    height: "720px",
    border: "0",
    visibility: "hidden",
    pointerEvents: "none",
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(iframe);

  let navigated = false;

  const goto = (url: string): Promise<void> => {
    if (isCrossOrigin(url)) {
      return Promise.reject(
        new Error(
          `page.goto(${JSON.stringify(url)}) targets a cross-origin URL. The ` +
            "in-page runner can only navigate same-origin routes of this app " +
            "(e.g. \"/dashboard\"). Switch to the Playwright bridge for external sites."
        )
      );
    }
    const resolved = new URL(url, window.location.href).href;
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`page.goto(${JSON.stringify(url)}) timed out after ${NAV_TIMEOUT_MS / 1000}s.`));
      }, NAV_TIMEOUT_MS);
      const onLoad = () => {
        cleanup();
        try {
          // Surface a cross-origin redirect (same-origin request → off-site) now.
          readDoc(iframe);
          navigated = true;
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      const onError = () => {
        cleanup();
        reject(new Error(`page.goto(${JSON.stringify(url)}) failed to load.`));
      };
      const cleanup = () => {
        clearTimeout(timer);
        iframe.removeEventListener("load", onLoad);
        iframe.removeEventListener("error", onError);
      };
      iframe.addEventListener("load", onLoad);
      iframe.addEventListener("error", onError);
      iframe.src = resolved;
    });
  };

  const doc = (): Document => {
    if (!navigated) {
      throw new Error(
        "No page loaded — call await page.goto(\"/route\") before querying the page in the in-page runner."
      );
    }
    return readDoc(iframe);
  };

  const screenshot = async () => {
    const d = doc();
    const view = iframe.contentWindow;
    const width = view?.innerWidth || iframe.clientWidth || 1280;
    const height = view?.innerHeight || iframe.clientHeight || 720;

    // Serialize the iframe document into an <img> via SVG <foreignObject>, then
    // draw it to a canvas. Works only for same-origin content (enforced above).
    const serialized = new XMLSerializer().serializeToString(d.documentElement);
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
      `<foreignObject width="100%" height="100%">${serialized}</foreignObject>` +
      `</svg>`;
    const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

    const img = new Image();
    img.width = width;
    img.height = height;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () =>
        reject(
          new Error(
            "page.screenshot() could not rasterize the page (likely cross-origin " +
              "resources tainting the canvas). Use the Playwright bridge for a real capture."
          )
        );
      img.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("page.screenshot() failed: no 2D canvas context.");
    ctx.drawImage(img, 0, 0, width, height);
    let dataUrl: string;
    try {
      dataUrl = canvas.toDataURL("image/png");
    } catch {
      throw new Error(
        "page.screenshot() failed: the canvas was tainted by cross-origin content. " +
          "Use the Playwright bridge for a real capture."
      );
    }
    return { dataUrl, width, height };
  };

  return {
    iframe,
    doc,
    goto,
    screenshot,
    destroy: () => {
      iframe.remove();
    },
  };
}
