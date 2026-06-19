Here’s a distilled **plain CSS design system** for the Next.js TDD Toolkit mockup.

It uses a single namespace: `tdd-`.

## Design system summary

Core visual language:

```txt
Dark IDE shell
Subtle glass panels
Next.js-like neutral palette
Blue = active/focus
Green = success
Red = destructive/failure
Amber = warning/logs
Rounded but not bubbly
Dense developer-tool spacing
```

Component state conventions:

```html
<button class="tdd-button" data-variant="primary">Run</button>
<button class="tdd-button" data-variant="danger">Delete</button>
<button class="tdd-button" disabled>Save</button>

<div class="tdd-snippet" data-state="active"></div>
<div class="tdd-tab" aria-selected="true"></div>
<div class="tdd-result-row" data-status="failed" data-state="expanded"></div>
<div class="tdd-runner-option" data-state="selected"></div>
```

---

```css
/* ==========================================================================
   Next.js TDD Toolkit Design System
   Plain CSS, no framework required
   ========================================================================== */

/* --------------------------------------------------------------------------
   1. Tokens
   -------------------------------------------------------------------------- */

:root {
  color-scheme: dark;

  /* Surfaces */
  --tdd-bg: #05070a;
  --tdd-bg-elevated: #080b10;
  --tdd-surface-1: #0b0f14;
  --tdd-surface-2: #10151d;
  --tdd-surface-3: #151b24;
  --tdd-surface-hover: #1a2230;
  --tdd-surface-active: #101b2e;

  /* Borders */
  --tdd-border-subtle: rgba(255, 255, 255, 0.07);
  --tdd-border: rgba(255, 255, 255, 0.11);
  --tdd-border-strong: rgba(255, 255, 255, 0.18);

  /* Text */
  --tdd-text: #f6f7f9;
  --tdd-text-muted: #9aa4b2;
  --tdd-text-subtle: #6f7a89;
  --tdd-text-disabled: #4d5663;

  /* Accents */
  --tdd-blue: #3b82f6;
  --tdd-blue-soft: rgba(59, 130, 246, 0.16);
  --tdd-blue-border: rgba(59, 130, 246, 0.44);

  --tdd-green: #22c55e;
  --tdd-green-soft: rgba(34, 197, 94, 0.14);
  --tdd-green-border: rgba(34, 197, 94, 0.35);

  --tdd-red: #ef4444;
  --tdd-red-soft: rgba(239, 68, 68, 0.14);
  --tdd-red-border: rgba(239, 68, 68, 0.38);

  --tdd-amber: #f59e0b;
  --tdd-amber-soft: rgba(245, 158, 11, 0.14);

  --tdd-purple: #c084fc;
  --tdd-cyan: #38bdf8;

  /* Shadows */
  --tdd-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.35);
  --tdd-shadow-md: 0 12px 32px rgba(0, 0, 0, 0.36);
  --tdd-shadow-lg: 0 24px 80px rgba(0, 0, 0, 0.5);
  --tdd-glow-blue: 0 0 0 1px var(--tdd-blue-border), 0 0 32px rgba(59, 130, 246, 0.13);
  --tdd-glow-red: 0 0 0 1px var(--tdd-red-border), 0 0 32px rgba(239, 68, 68, 0.11);

  /* Radius */
  --tdd-radius-xs: 4px;
  --tdd-radius-sm: 6px;
  --tdd-radius-md: 9px;
  --tdd-radius-lg: 12px;
  --tdd-radius-xl: 16px;
  --tdd-radius-pill: 999px;

  /* Spacing */
  --tdd-space-1: 4px;
  --tdd-space-2: 8px;
  --tdd-space-3: 12px;
  --tdd-space-4: 16px;
  --tdd-space-5: 20px;
  --tdd-space-6: 24px;

  /* Typography */
  --tdd-font-sans:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
  --tdd-font-mono:
    "Geist Mono", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;

  --tdd-text-xs: 11px;
  --tdd-text-sm: 12px;
  --tdd-text-md: 14px;
  --tdd-text-lg: 16px;
  --tdd-text-xl: 20px;

  --tdd-line-tight: 1.2;
  --tdd-line-normal: 1.45;

  /* Motion */
  --tdd-ease: cubic-bezier(0.2, 0.8, 0.2, 1);
  --tdd-duration-fast: 120ms;
  --tdd-duration: 180ms;
}

/* --------------------------------------------------------------------------
   2. Base Shell
   -------------------------------------------------------------------------- */

.tdd-shell {
  min-height: 100vh;
  padding: var(--tdd-space-4);
  color: var(--tdd-text);
  font-family: var(--tdd-font-sans);
  background:
    radial-gradient(circle at 20% -10%, rgba(59, 130, 246, 0.12), transparent 35%),
    radial-gradient(circle at 90% 10%, rgba(255, 255, 255, 0.06), transparent 28%),
    var(--tdd-bg);
}

.tdd-app {
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  gap: var(--tdd-space-3);
  max-width: 1720px;
  margin: 0 auto;
}

.tdd-main-grid {
  display: grid;
  grid-template-columns: 300px minmax(540px, 1fr) 420px;
  gap: var(--tdd-space-2);
  min-height: 660px;
}

.tdd-bottom-grid {
  display: grid;
  grid-template-columns: 300px 1fr 300px 420px;
  gap: var(--tdd-space-2);
}

.tdd-panel {
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.035), transparent 36%),
    var(--tdd-surface-1);
  border: 1px solid var(--tdd-border);
  border-radius: var(--tdd-radius-lg);
  box-shadow: var(--tdd-shadow-sm);
}

.tdd-panel[data-interactive="true"] {
  transition:
    border-color var(--tdd-duration) var(--tdd-ease),
    background var(--tdd-duration) var(--tdd-ease),
    box-shadow var(--tdd-duration) var(--tdd-ease);
}

.tdd-panel[data-interactive="true"]:hover {
  border-color: var(--tdd-border-strong);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.045), transparent 36%),
    var(--tdd-surface-2);
}

.tdd-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 42px;
  padding: 0 var(--tdd-space-3);
  border-bottom: 1px solid var(--tdd-border-subtle);
}

.tdd-panel-title {
  margin: 0;
  font-size: var(--tdd-text-lg);
  font-weight: 650;
  letter-spacing: -0.02em;
}

.tdd-panel-subtitle {
  margin: 2px 0 0;
  color: var(--tdd-text-muted);
  font-size: var(--tdd-text-sm);
}

/* --------------------------------------------------------------------------
   3. Brand Header
   -------------------------------------------------------------------------- */

.tdd-brand {
  display: flex;
  align-items: center;
  gap: var(--tdd-space-3);
}

.tdd-logo {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  color: var(--tdd-text);
  font-weight: 800;
  background: #000;
  border: 1px solid var(--tdd-border-strong);
  border-radius: var(--tdd-radius-md);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}

.tdd-brand-title {
  margin: 0;
  font-size: var(--tdd-text-xl);
  font-weight: 700;
  letter-spacing: -0.03em;
}

.tdd-brand-subtitle {
  margin: 2px 0 0;
  color: var(--tdd-text-muted);
  font-size: var(--tdd-text-md);
}

/* --------------------------------------------------------------------------
   4. Toolbar
   -------------------------------------------------------------------------- */

.tdd-toolbar {
  display: flex;
  align-items: center;
  gap: var(--tdd-space-2);
  padding: var(--tdd-space-2);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.045), transparent),
    var(--tdd-surface-1);
  border: 1px solid var(--tdd-border);
  border-radius: var(--tdd-radius-lg);
  box-shadow: var(--tdd-shadow-sm);
}

.tdd-toolbar-group {
  display: flex;
  align-items: center;
  gap: var(--tdd-space-2);
  padding-right: var(--tdd-space-2);
  border-right: 1px solid var(--tdd-border-subtle);
}

.tdd-toolbar-group:last-child {
  border-right: 0;
}

/* --------------------------------------------------------------------------
   5. Buttons
   -------------------------------------------------------------------------- */

.tdd-button,
.tdd-icon-button {
  --button-bg: var(--tdd-surface-2);
  --button-border: var(--tdd-border);
  --button-text: var(--tdd-text);

  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--tdd-space-2);
  height: 36px;
  padding: 0 var(--tdd-space-3);
  color: var(--button-text);
  font: 600 var(--tdd-text-sm) / 1 var(--tdd-font-sans);
  white-space: nowrap;
  user-select: none;
  background: var(--button-bg);
  border: 1px solid var(--button-border);
  border-radius: var(--tdd-radius-md);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  cursor: pointer;
  transition:
    background var(--tdd-duration-fast) var(--tdd-ease),
    border-color var(--tdd-duration-fast) var(--tdd-ease),
    color var(--tdd-duration-fast) var(--tdd-ease),
    transform var(--tdd-duration-fast) var(--tdd-ease),
    box-shadow var(--tdd-duration-fast) var(--tdd-ease);
}

.tdd-icon-button {
  width: 36px;
  padding: 0;
}

.tdd-button:hover,
.tdd-icon-button:hover {
  --button-bg: var(--tdd-surface-hover);
  --button-border: var(--tdd-border-strong);
}

.tdd-button:active,
.tdd-icon-button:active {
  transform: translateY(1px);
}

.tdd-button:focus-visible,
.tdd-icon-button:focus-visible {
  outline: none;
  box-shadow: var(--tdd-glow-blue);
}

.tdd-button:disabled,
.tdd-icon-button:disabled,
.tdd-button[aria-disabled="true"],
.tdd-icon-button[aria-disabled="true"] {
  color: var(--tdd-text-disabled);
  background: var(--tdd-surface-1);
  border-color: var(--tdd-border-subtle);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.tdd-button[data-variant="primary"] {
  --button-bg: var(--tdd-blue-soft);
  --button-border: var(--tdd-blue-border);
  --button-text: #dbeafe;
}

.tdd-button[data-variant="primary"]:hover {
  --button-bg: rgba(59, 130, 246, 0.23);
}

.tdd-button[data-variant="danger"] {
  --button-bg: var(--tdd-red-soft);
  --button-border: rgba(239, 68, 68, 0.24);
  --button-text: #fecaca;
}

.tdd-button[data-variant="danger"]:hover {
  --button-bg: rgba(239, 68, 68, 0.22);
  --button-border: var(--tdd-red-border);
}

.tdd-button[data-state="loading"] {
  pointer-events: none;
  opacity: 0.78;
}

.tdd-button[data-state="loading"]::before {
  width: 12px;
  height: 12px;
  content: "";
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: tdd-spin 700ms linear infinite;
}

.tdd-kbd {
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 5px;
  color: var(--tdd-text-muted);
  font: 600 10px / 1 var(--tdd-font-mono);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--tdd-border-subtle);
  border-radius: var(--tdd-radius-xs);
}

/* --------------------------------------------------------------------------
   6. Inputs
   -------------------------------------------------------------------------- */

.tdd-input,
.tdd-search {
  width: 100%;
  height: 36px;
  padding: 0 var(--tdd-space-3);
  color: var(--tdd-text);
  font: 500 var(--tdd-text-sm) / 1 var(--tdd-font-sans);
  background: rgba(0, 0, 0, 0.18);
  border: 1px solid var(--tdd-border);
  border-radius: var(--tdd-radius-md);
  outline: none;
  transition:
    background var(--tdd-duration-fast) var(--tdd-ease),
    border-color var(--tdd-duration-fast) var(--tdd-ease),
    box-shadow var(--tdd-duration-fast) var(--tdd-ease);
}

.tdd-input::placeholder,
.tdd-search::placeholder {
  color: var(--tdd-text-subtle);
}

.tdd-input:hover,
.tdd-search:hover {
  border-color: var(--tdd-border-strong);
}

.tdd-input:focus,
.tdd-search:focus {
  border-color: var(--tdd-blue-border);
  background: rgba(0, 0, 0, 0.26);
  box-shadow: var(--tdd-glow-blue);
}

.tdd-input:disabled,
.tdd-search:disabled {
  color: var(--tdd-text-disabled);
  cursor: not-allowed;
  background: var(--tdd-surface-1);
}

/* --------------------------------------------------------------------------
   7. Snippet Sidebar
   -------------------------------------------------------------------------- */

.tdd-snippets {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.tdd-snippet-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--tdd-space-1);
  min-height: 0;
  padding: var(--tdd-space-2);
  overflow: auto;
}

.tdd-snippet {
  display: grid;
  grid-template-columns: 24px 1fr auto;
  gap: var(--tdd-space-2);
  align-items: center;
  min-height: 58px;
  padding: var(--tdd-space-2);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--tdd-radius-md);
  cursor: pointer;
  transition:
    background var(--tdd-duration-fast) var(--tdd-ease),
    border-color var(--tdd-duration-fast) var(--tdd-ease),
    transform var(--tdd-duration-fast) var(--tdd-ease);
}

.tdd-snippet:hover {
  background: var(--tdd-surface-hover);
  border-color: var(--tdd-border-subtle);
}

.tdd-snippet:focus-visible {
  outline: none;
  box-shadow: var(--tdd-glow-blue);
}

.tdd-snippet:active {
  transform: translateY(1px);
}

.tdd-snippet[data-state="active"] {
  background: var(--tdd-surface-active);
  border-color: var(--tdd-blue-border);
}

.tdd-snippet[data-state="renaming"] {
  background: rgba(59, 130, 246, 0.1);
  border-color: var(--tdd-blue-border);
}

.tdd-snippet[data-state="dragging"] {
  opacity: 0.7;
  transform: scale(0.99);
}

.tdd-snippet-icon {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  color: var(--tdd-text-muted);
}

.tdd-snippet[data-state="active"] .tdd-snippet-icon {
  color: var(--tdd-blue);
}

.tdd-snippet-title {
  margin: 0;
  color: var(--tdd-text);
  font-size: var(--tdd-text-md);
  font-weight: 650;
}

.tdd-snippet-description {
  margin: 3px 0 0;
  color: var(--tdd-text-muted);
  font-size: var(--tdd-text-sm);
}

.tdd-snippet-meta {
  color: var(--tdd-text-subtle);
  font-size: var(--tdd-text-xs);
}

.tdd-sidebar-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--tdd-space-2);
  padding: var(--tdd-space-2);
  border-top: 1px solid var(--tdd-border-subtle);
}

/* --------------------------------------------------------------------------
   8. Tabs
   -------------------------------------------------------------------------- */

.tdd-tabs {
  display: flex;
  align-items: stretch;
  height: 44px;
  background: var(--tdd-surface-1);
  border-bottom: 1px solid var(--tdd-border);
}

.tdd-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: var(--tdd-space-2);
  min-width: 160px;
  max-width: 240px;
  padding: 0 var(--tdd-space-3);
  color: var(--tdd-text-muted);
  font-size: var(--tdd-text-sm);
  font-weight: 600;
  background: transparent;
  border: 0;
  border-right: 1px solid var(--tdd-border-subtle);
  cursor: pointer;
  transition:
    color var(--tdd-duration-fast) var(--tdd-ease),
    background var(--tdd-duration-fast) var(--tdd-ease);
}

.tdd-tab:hover {
  color: var(--tdd-text);
  background: rgba(255, 255, 255, 0.035);
}

.tdd-tab:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 2px var(--tdd-blue-border);
}

.tdd-tab[aria-selected="true"] {
  color: var(--tdd-text);
  background: var(--tdd-bg-elevated);
}

.tdd-tab[aria-selected="true"]::before {
  position: absolute;
  inset: 0 0 auto 0;
  height: 2px;
  content: "";
  background: var(--tdd-blue);
}

.tdd-tab[data-state="dirty"]::after {
  width: 6px;
  height: 6px;
  content: "";
  background: var(--tdd-amber);
  border-radius: 50%;
}

.tdd-tab-close {
  margin-left: auto;
  opacity: 0.45;
}

.tdd-tab:hover .tdd-tab-close {
  opacity: 1;
}

.tdd-file-badge {
  color: var(--tdd-blue);
  font: 700 var(--tdd-text-xs) / 1 var(--tdd-font-mono);
}

/* --------------------------------------------------------------------------
   9. Monaco-style Editor Shell
   -------------------------------------------------------------------------- */

.tdd-editor {
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-height: 460px;
  background: #070a0f;
}

.tdd-code {
  display: grid;
  grid-template-columns: 52px 1fr;
  min-height: 0;
  overflow: auto;
  font-family: var(--tdd-font-mono);
  font-size: 14px;
  line-height: 1.65;
}

.tdd-code-gutter {
  padding: var(--tdd-space-3) var(--tdd-space-2);
  color: var(--tdd-text-subtle);
  text-align: right;
  background: rgba(255, 255, 255, 0.015);
  border-right: 1px solid var(--tdd-border-subtle);
  user-select: none;
}

.tdd-code-content {
  min-width: 680px;
  padding: var(--tdd-space-3);
  white-space: pre;
}

.tdd-code-line {
  display: block;
  min-height: 23px;
  padding: 0 var(--tdd-space-2);
  border-radius: var(--tdd-radius-xs);
}

.tdd-code-line[data-state="active"] {
  background: rgba(255, 255, 255, 0.055);
}

.tdd-code-line[data-state="error"] {
  background: rgba(239, 68, 68, 0.11);
  box-shadow: inset 3px 0 0 var(--tdd-red);
}

.tdd-token-keyword { color: #c084fc; }
.tdd-token-string { color: #f6ad55; }
.tdd-token-function { color: #60a5fa; }
.tdd-token-comment { color: #86efac; }
.tdd-token-variable { color: #e5e7eb; }
.tdd-token-property { color: #38bdf8; }
.tdd-token-punctuation { color: #94a3b8; }

.tdd-editor-status {
  display: flex;
  justify-content: flex-end;
  gap: var(--tdd-space-3);
  height: 30px;
  padding: 0 var(--tdd-space-3);
  color: var(--tdd-text-muted);
  font: 500 var(--tdd-text-xs) / 30px var(--tdd-font-sans);
  border-top: 1px solid var(--tdd-border-subtle);
}

/* --------------------------------------------------------------------------
   10. Badges
   -------------------------------------------------------------------------- */

.tdd-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--tdd-space-1);
  height: 28px;
  padding: 0 var(--tdd-space-3);
  font-size: var(--tdd-text-sm);
  font-weight: 700;
  border: 1px solid var(--tdd-border);
  border-radius: var(--tdd-radius-md);
  background: var(--tdd-surface-2);
}

.tdd-badge[data-tone="success"] {
  color: #bbf7d0;
  background: var(--tdd-green-soft);
  border-color: var(--tdd-green-border);
}

.tdd-badge[data-tone="danger"] {
  color: #fecaca;
  background: var(--tdd-red-soft);
  border-color: var(--tdd-red-border);
}

.tdd-badge[data-tone="info"] {
  color: #bfdbfe;
  background: var(--tdd-blue-soft);
  border-color: var(--tdd-blue-border);
}

.tdd-badge[data-tone="neutral"] {
  color: var(--tdd-text);
}

/* --------------------------------------------------------------------------
   11. Test Results
   -------------------------------------------------------------------------- */

.tdd-results {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.tdd-result-summary {
  display: flex;
  gap: var(--tdd-space-2);
  padding: var(--tdd-space-3);
}

.tdd-result-meta {
  display: flex;
  justify-content: space-between;
  padding: 0 var(--tdd-space-3) var(--tdd-space-3);
  color: var(--tdd-text-muted);
  font-size: var(--tdd-text-sm);
  border-bottom: 1px solid var(--tdd-border-subtle);
}

.tdd-result-list {
  min-height: 0;
  overflow: auto;
}

.tdd-result-row {
  display: grid;
  grid-template-columns: 22px 1fr auto;
  gap: var(--tdd-space-2);
  align-items: start;
  padding: var(--tdd-space-3);
  border-bottom: 1px solid var(--tdd-border-subtle);
  cursor: pointer;
  transition:
    background var(--tdd-duration-fast) var(--tdd-ease),
    color var(--tdd-duration-fast) var(--tdd-ease);
}

.tdd-result-row:hover {
  background: rgba(255, 255, 255, 0.035);
}

.tdd-result-row:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 2px var(--tdd-blue-border);
}

.tdd-result-row[data-status="passed"] {
  color: var(--tdd-text);
}

.tdd-result-row[data-status="failed"] {
  color: #fecaca;
}

.tdd-result-row[data-state="expanded"] {
  background: rgba(239, 68, 68, 0.055);
}

.tdd-result-icon {
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  border-radius: 50%;
}

.tdd-result-row[data-status="passed"] .tdd-result-icon {
  color: var(--tdd-green);
}

.tdd-result-row[data-status="failed"] .tdd-result-icon {
  color: var(--tdd-red);
}

.tdd-result-name {
  margin: 0;
  font-size: var(--tdd-text-sm);
  font-weight: 600;
}

.tdd-result-time {
  color: var(--tdd-text-muted);
  font-size: var(--tdd-text-xs);
}

.tdd-error-block {
  grid-column: 2 / -1;
  margin-top: var(--tdd-space-2);
  padding: var(--tdd-space-3);
  color: #fecaca;
  font: 500 var(--tdd-text-xs) / 1.55 var(--tdd-font-mono);
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.18);
  border-left: 3px solid var(--tdd-red);
  border-radius: var(--tdd-radius-md);
}

.tdd-log-block {
  margin-top: var(--tdd-space-2);
  padding: var(--tdd-space-2);
  color: var(--tdd-text-muted);
  font: 500 var(--tdd-text-xs) / 1.5 var(--tdd-font-mono);
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--tdd-border-subtle);
  border-radius: var(--tdd-radius-sm);
}

/* --------------------------------------------------------------------------
   12. Selector Picker
   -------------------------------------------------------------------------- */

.tdd-selector-picker {
  padding: var(--tdd-space-3);
}

.tdd-picker-target {
  display: grid;
  width: 72px;
  height: 56px;
  place-items: center;
  margin-left: auto;
  color: var(--tdd-text);
  background: rgba(255, 255, 255, 0.025);
  border: 1px dashed var(--tdd-border-strong);
  border-radius: var(--tdd-radius-md);
  cursor: crosshair;
  transition:
    background var(--tdd-duration-fast) var(--tdd-ease),
    border-color var(--tdd-duration-fast) var(--tdd-ease),
    box-shadow var(--tdd-duration-fast) var(--tdd-ease);
}

.tdd-picker-target:hover {
  background: var(--tdd-blue-soft);
  border-color: var(--tdd-blue-border);
}

.tdd-picker-target:focus-visible {
  outline: none;
  box-shadow: var(--tdd-glow-blue);
}

.tdd-picker-target[data-state="active"] {
  background: var(--tdd-blue-soft);
  border-color: var(--tdd-blue);
  box-shadow: var(--tdd-glow-blue);
}

.tdd-selected-element {
  margin-top: var(--tdd-space-3);
  padding: var(--tdd-space-3);
  font-family: var(--tdd-font-mono);
  font-size: var(--tdd-text-sm);
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--tdd-border-subtle);
  border-radius: var(--tdd-radius-md);
}

.tdd-element-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #bfdbfe;
}

.tdd-element-pill strong {
  padding: 2px 7px;
  color: white;
  background: var(--tdd-blue);
  border-radius: var(--tdd-radius-sm);
}

.tdd-selector-code {
  display: block;
  margin-top: var(--tdd-space-2);
  color: #fbbf24;
}

/* --------------------------------------------------------------------------
   13. DOM Query Helpers
   -------------------------------------------------------------------------- */

.tdd-helper-list {
  display: grid;
  gap: var(--tdd-space-2);
  padding: var(--tdd-space-3);
}

.tdd-helper {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--tdd-space-2);
  align-items: center;
  padding: var(--tdd-space-2);
  background: var(--tdd-surface-2);
  border: 1px solid var(--tdd-border-subtle);
  border-radius: var(--tdd-radius-md);
  transition:
    background var(--tdd-duration-fast) var(--tdd-ease),
    border-color var(--tdd-duration-fast) var(--tdd-ease);
}

.tdd-helper:hover {
  background: var(--tdd-surface-hover);
  border-color: var(--tdd-border);
}

.tdd-helper-name {
  margin: 0;
  color: #93c5fd;
  font: 700 var(--tdd-text-sm) / 1.3 var(--tdd-font-mono);
}

.tdd-helper-description {
  margin: 2px 0 0;
  color: var(--tdd-text-muted);
  font-size: var(--tdd-text-xs);
}

.tdd-copy-button {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  color: var(--tdd-text-muted);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--tdd-radius-sm);
  cursor: pointer;
}

.tdd-copy-button:hover {
  color: var(--tdd-text);
  background: rgba(255, 255, 255, 0.06);
  border-color: var(--tdd-border);
}

.tdd-copy-button:focus-visible {
  outline: none;
  box-shadow: var(--tdd-glow-blue);
}

.tdd-copy-button[data-state="copied"] {
  color: var(--tdd-green);
  background: var(--tdd-green-soft);
  border-color: var(--tdd-green-border);
}

/* --------------------------------------------------------------------------
   14. Runner / Execution Mode
   -------------------------------------------------------------------------- */

.tdd-runner-options {
  display: grid;
  gap: var(--tdd-space-2);
  padding: var(--tdd-space-3);
}

.tdd-runner-option {
  display: grid;
  grid-template-columns: 36px 1fr 18px;
  gap: var(--tdd-space-3);
  align-items: center;
  padding: var(--tdd-space-3);
  background: var(--tdd-surface-2);
  border: 1px solid var(--tdd-border-subtle);
  border-radius: var(--tdd-radius-md);
  cursor: pointer;
  transition:
    background var(--tdd-duration-fast) var(--tdd-ease),
    border-color var(--tdd-duration-fast) var(--tdd-ease),
    box-shadow var(--tdd-duration-fast) var(--tdd-ease);
}

.tdd-runner-option:hover {
  background: var(--tdd-surface-hover);
  border-color: var(--tdd-border);
}

.tdd-runner-option:focus-visible {
  outline: none;
  box-shadow: var(--tdd-glow-blue);
}

.tdd-runner-option[data-state="selected"] {
  background: var(--tdd-blue-soft);
  border-color: var(--tdd-blue-border);
  box-shadow: var(--tdd-glow-blue);
}

.tdd-runner-icon {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  color: var(--tdd-text);
  background: rgba(255, 255, 255, 0.055);
  border-radius: 50%;
}

.tdd-runner-title {
  margin: 0;
  font-size: var(--tdd-text-md);
  font-weight: 700;
}

.tdd-runner-description {
  margin: 3px 0 0;
  color: var(--tdd-text-muted);
  font-size: var(--tdd-text-xs);
  line-height: var(--tdd-line-normal);
}

.tdd-radio-dot {
  width: 16px;
  height: 16px;
  border: 1px solid var(--tdd-border-strong);
  border-radius: 50%;
}

.tdd-runner-option[data-state="selected"] .tdd-radio-dot {
  border: 4px solid var(--tdd-blue);
  background: white;
}

/* --------------------------------------------------------------------------
   15. Page Preview
   -------------------------------------------------------------------------- */

.tdd-preview {
  padding: var(--tdd-space-3);
}

.tdd-browser {
  overflow: hidden;
  background: #f8fafc;
  border: 1px solid var(--tdd-border);
  border-radius: var(--tdd-radius-md);
  box-shadow: var(--tdd-shadow-md);
}

.tdd-browser-bar {
  display: flex;
  align-items: center;
  gap: var(--tdd-space-2);
  height: 34px;
  padding: 0 var(--tdd-space-2);
  color: #64748b;
  background: #0f172a;
}

.tdd-url {
  flex: 1;
  height: 22px;
  padding: 0 var(--tdd-space-2);
  color: #cbd5e1;
  font: 500 var(--tdd-text-xs) / 22px var(--tdd-font-mono);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--tdd-radius-sm);
}

.tdd-page {
  padding: var(--tdd-space-4);
  color: #020617;
  background: white;
}

.tdd-page-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--tdd-space-4);
  font-size: 11px;
  font-weight: 700;
}

.tdd-page-hero {
  display: grid;
  grid-template-columns: 1fr 120px;
  gap: var(--tdd-space-4);
  align-items: center;
}

.tdd-page-title {
  margin: 0;
  font-size: 24px;
  line-height: 1;
  letter-spacing: -0.04em;
}

.tdd-page-copy {
  margin: var(--tdd-space-2) 0;
  color: #334155;
  font-size: 11px;
}

.tdd-page-button {
  display: inline-flex;
  height: 30px;
  align-items: center;
  padding: 0 var(--tdd-space-3);
  color: white;
  font-size: 12px;
  font-weight: 700;
  background: #2563eb;
  border-radius: 6px;
}

.tdd-page-art {
  height: 100px;
  background:
    radial-gradient(circle at 50% 40%, rgba(37, 99, 235, 0.16), transparent 55%),
    #dbeafe;
  border-radius: 12px;
}

/* --------------------------------------------------------------------------
   16. Status Bar
   -------------------------------------------------------------------------- */

.tdd-status-bar {
  display: flex;
  align-items: center;
  gap: var(--tdd-space-3);
  min-height: 42px;
  padding: 0 var(--tdd-space-3);
  color: var(--tdd-text-muted);
  font-size: var(--tdd-text-sm);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.035), transparent),
    var(--tdd-surface-1);
  border: 1px solid var(--tdd-border);
  border-radius: var(--tdd-radius-lg);
}

.tdd-status-item {
  display: inline-flex;
  align-items: center;
  gap: var(--tdd-space-2);
  white-space: nowrap;
}

.tdd-status-spacer {
  flex: 1;
}

.tdd-status-divider {
  width: 1px;
  height: 20px;
  background: var(--tdd-border-subtle);
}

.tdd-dot {
  width: 8px;
  height: 8px;
  background: var(--tdd-text-subtle);
  border-radius: 50%;
}

.tdd-dot[data-tone="success"] {
  background: var(--tdd-green);
  box-shadow: 0 0 12px rgba(34, 197, 94, 0.55);
}

.tdd-dot[data-tone="danger"] {
  background: var(--tdd-red);
  box-shadow: 0 0 12px rgba(239, 68, 68, 0.55);
}

.tdd-dot[data-tone="info"] {
  background: var(--tdd-blue);
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.55);
}

/* --------------------------------------------------------------------------
   17. Annotation Callouts
   -------------------------------------------------------------------------- */

.tdd-callout {
  display: inline-flex;
  align-items: center;
  gap: var(--tdd-space-2);
  padding: 7px 10px;
  color: #020617;
  font-size: var(--tdd-text-sm);
  font-weight: 800;
  line-height: 1.2;
  background: white;
  border: 1px solid rgba(2, 6, 23, 0.12);
  border-radius: var(--tdd-radius-md);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
}

.tdd-callout-number {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  color: white;
  background: #020617;
  border-radius: var(--tdd-radius-sm);
}

/* --------------------------------------------------------------------------
   18. Menus / Popovers
   -------------------------------------------------------------------------- */

.tdd-menu {
  min-width: 180px;
  padding: var(--tdd-space-1);
  background: var(--tdd-surface-2);
  border: 1px solid var(--tdd-border);
  border-radius: var(--tdd-radius-md);
  box-shadow: var(--tdd-shadow-lg);
}

.tdd-menu-item {
  display: flex;
  align-items: center;
  gap: var(--tdd-space-2);
  width: 100%;
  height: 34px;
  padding: 0 var(--tdd-space-2);
  color: var(--tdd-text);
  font: 500 var(--tdd-text-sm) / 1 var(--tdd-font-sans);
  text-align: left;
  background: transparent;
  border: 0;
  border-radius: var(--tdd-radius-sm);
  cursor: pointer;
}

.tdd-menu-item:hover,
.tdd-menu-item[data-highlighted="true"] {
  background: var(--tdd-surface-hover);
}

.tdd-menu-item:focus-visible {
  outline: none;
  box-shadow: var(--tdd-glow-blue);
}

.tdd-menu-item[data-variant="danger"] {
  color: #fecaca;
}

.tdd-menu-item[data-variant="danger"]:hover {
  background: var(--tdd-red-soft);
}

/* --------------------------------------------------------------------------
   19. Scrollbars
   -------------------------------------------------------------------------- */

.tdd-shell * {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.18) transparent;
}

.tdd-shell *::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.tdd-shell *::-webkit-scrollbar-track {
  background: transparent;
}

.tdd-shell *::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.14);
  border: 3px solid transparent;
  border-radius: var(--tdd-radius-pill);
  background-clip: padding-box;
}

.tdd-shell *::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.22);
  border: 3px solid transparent;
  background-clip: padding-box;
}

/* --------------------------------------------------------------------------
   20. Utilities
   -------------------------------------------------------------------------- */

.tdd-muted {
  color: var(--tdd-text-muted);
}

.tdd-subtle {
  color: var(--tdd-text-subtle);
}

.tdd-mono {
  font-family: var(--tdd-font-mono);
}

.tdd-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tdd-stack {
  display: grid;
  gap: var(--tdd-space-2);
}

.tdd-row {
  display: flex;
  align-items: center;
  gap: var(--tdd-space-2);
}

.tdd-row-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--tdd-space-2);
}

/* --------------------------------------------------------------------------
   21. Animations
   -------------------------------------------------------------------------- */

@keyframes tdd-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tdd-shell *,
  .tdd-shell *::before,
  .tdd-shell *::after {
    animation-duration: 1ms !important;
    transition-duration: 1ms !important;
    scroll-behavior: auto !important;
  }
}

/* --------------------------------------------------------------------------
   22. Responsive Layout
   -------------------------------------------------------------------------- */

@media (max-width: 1280px) {
  .tdd-main-grid {
    grid-template-columns: 280px minmax(480px, 1fr);
  }

  .tdd-main-grid > .tdd-results {
    grid-column: 1 / -1;
    min-height: 320px;
  }

  .tdd-bottom-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .tdd-shell {
    padding: var(--tdd-space-2);
  }

  .tdd-toolbar {
    flex-wrap: wrap;
  }

  .tdd-main-grid,
  .tdd-bottom-grid {
    grid-template-columns: 1fr;
  }

  .tdd-status-bar {
    flex-wrap: wrap;
    padding: var(--tdd-space-2);
  }

  .tdd-status-spacer {
    display: none;
  }
}
```

## Minimal component map

Use these as the main building blocks:

```txt
.tdd-shell
.tdd-app
.tdd-toolbar
.tdd-button
.tdd-icon-button
.tdd-panel
.tdd-snippets
.tdd-snippet
.tdd-tabs
.tdd-tab
.tdd-editor
.tdd-code
.tdd-results
.tdd-result-row
.tdd-badge
.tdd-selector-picker
.tdd-picker-target
.tdd-helper
.tdd-runner-option
.tdd-preview
.tdd-status-bar
.tdd-menu
.tdd-callout
```

The strongest state hooks are:

```css
[data-state="active"]
[data-state="selected"]
[data-state="expanded"]
[data-state="loading"]
[data-state="dirty"]
[data-state="copied"]
[data-state="renaming"]
[data-state="dragging"]
[data-status="passed"]
[data-status="failed"]
[data-variant="primary"]
[data-variant="danger"]
[aria-selected="true"]
:focus-visible
:hover
:active
:disabled
```

That gives you enough structure to implement the whole widget with plain CSS while keeping the React/Next.js components thin.
