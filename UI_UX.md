# UI/UX — Spec → Implementation Map

This traces the requirements in `game_toolkit_interaction_fr_nfr_spec.docx` to the
GameKit implementation, so the design system stays accountable to the spec.

## State model (spec §2.1)

Implemented globally in `src/styles/globals.css` via `data-*` attributes and
`:focus-visible`, and per-component through local component tokens.

| Spec state | Where it lives |
|---|---|
| default / hover / active | every interactive component's base + `:hover`/`:active` |
| focus-visible (high contrast) | `--focus-ring` token, applied via `:focus-visible` everywhere |
| selected / equipped / active | `data-state="selected"` (Sidebar, Tabs, ButtonGroup, Table rows, TreeView, Calendar, Card) |
| disabled / locked | `:disabled` + `data-disabled`, with explanation patterns (Field) |
| loading / cooldown | `data-loading`, Button spinner, Spinner, Skeleton, ProgressBar |
| success / warning / error | Button intents, Alert, Toast, Badge, Field validation |
| dragging / droppable / invalid-drop | FileUpload `data-state="droppable"` |

## Input model (spec §2.2)

- **Keyboard:** roving-tabindex arrow nav (Tabs), ↑/↓/Enter/Esc (CommandPalette),
  focus trap + Esc (Modal), Enter/Space activation (TreeView, FileUpload).
- **Gamepad-safe:** no hover-only affordances; Tooltip opens on focus too; all
  focus targets carry the high-contrast `--focus-ring`.
- **Mouse:** drag-and-drop (FileUpload), sortable columns (Table), carousel
  arrows + dots.
- **Touch:** large hit targets (≥32–44px controls), tap-friendly segmented controls.

## Feedback hierarchy (spec §2.3)

| Layer | Component |
|---|---|
| Inline | `Field` validation messages, disabled-reason hints |
| Toast | `ToastProvider` / `useToast` (auto-dismiss queue) |
| Banner | `Alert` (info/success/warning/danger, dismissible, with action) |
| Modal | `Modal` (confirm / destructive `tone="danger"`, focus-trapped) |
| HUD | `HudBar` / `HudPanel` (health/stamina/mana/xp) |

## Content-safety flows (spec IF-04)

Destructive actions use a dedicated danger treatment: `Modal tone="danger"`
("Delete Item") with a clear irreversible warning, plus `Button variant="danger"`
and danger-tinted `DropdownMenu` items.

## Non-functional

- **CSS-compatible:** semantic HTML, CSS variables, `data-state` attributes,
  grid/flex, restrained transitions — no runtime styling library.
- **Theming:** light/dark via `[data-theme]`; any token overridable at runtime.
- **Accessibility:** `prefers-reduced-motion` respected; ARIA roles on
  tabs/menus/dialogs/trees/progress; `sr-only` labels where needed.
- **Zero UI dependencies:** icons are inline SVG; only React/Next are required.
