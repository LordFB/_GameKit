# GameKit — CSS-Compatible Game Toolkit Design System

A sophisticated, extensible design system for game toolkits, built with **Next.js
(App Router) + TypeScript**. It implements every component on the reference
component board (`Components.png`) and follows the interaction spec in
`game_toolkit_interaction_fr_nfr_spec.docx`.

> Stateful · gamepad/keyboard-safe · themeable · zero UI dependencies.

## Quick start

```bash
npm install
npm run dev      # http://localhost:3000 — the full component showcase
npm run build    # production build (fully static)
npm run lint     # eslint (flat config, ESLint 9)
npm run typecheck
```

## Why this is a *design system*, not just components

The system is **token-driven**. Three layers of CSS custom properties
(`src/styles/tokens.css`) are the single source of truth:

1. **Primitive tokens** — raw palette ramps, spacing, radii, type scale, motion.
2. **Semantic tokens** — intent aliases (`--color-primary`, `--surface-1`,
   `--text-muted`, `--focus-ring`, …) that flip per theme.
3. **Component tokens** — each component reads semantics through local vars
   (e.g. `--btn-bg`), so a whole family re-skins by overriding one variable.

**Re-skin the entire system at runtime** by setting any token on `:root` or a
scoped element. Light/dark themes are just two token sets swapped via
`<html data-theme="light|dark">` — see the theme toggle in the showcase header.

```css
/* Make the whole product use a teal brand — nothing else changes. */
:root { --color-primary: #14b8a6; }
```

## Interaction model (from the spec)

Every control exposes **machine-readable state** so styling stays pure CSS:

```css
[data-state="selected"] { outline: 2px solid var(--color-primary); }
[data-loading="true"]   { pointer-events: none; opacity: .72; }
[data-invalid="true"]   { border-color: var(--color-danger); }
```

- **Full state matrix:** default, hover, focus-visible, active, selected,
  disabled, loading, success, warning, error, locked, cooldown, dragging,
  droppable, invalid-drop.
- **Keyboard & gamepad first:** every interactive element has a high-contrast
  `--focus-ring`; tabs/menus/command-palette use arrow-key navigation; nothing
  depends on hover alone.
- **Feedback hierarchy:** inline validation → toasts → banners → modals → HUD,
  each its own component.
- **`prefers-reduced-motion`** is honored globally.

## Component catalog

| Group | Components |
|---|---|
| **Navigation** | Navbar, Sidebar, Breadcrumb, Tabs, Pagination, Stepper, DropdownMenu |
| **Actions** | Button (primary/secondary/ghost/subtle/intents), ButtonGroup, SplitButton, FAB, icon buttons, all states |
| **Form Controls** | Input, PasswordInput, Textarea, Select, Checkbox, Radio/RadioGroup, Switch, Slider, RangeSlider, NumberInput, ColorPicker, FileUpload, Field (validation) |
| **Feedback** | ProgressBar, CircularProgress, Spinner, Skeleton, Alert, Toast (provider + hook), Modal, Badge |
| **Data Display** | Table (sortable), StatCard, Card, Avatar, AvatarGroup, Tooltip |
| **Media & Content** | Carousel, ChatBubble/ChatThread, Timeline |
| **Layout & Utility** | TreeView, Calendar, CommandPalette, EmptyState, ScrollArea |
| **Game-specific** | HudBar/HudPanel (health/stamina/mana/xp), Leaderboard |

## Usage

Everything is exported from a single barrel:

```tsx
import { Button, Card, useToast, Modal, HudPanel } from "@/components";
```

```tsx
function Example() {
  const { toast } = useToast();           // requires <ToastProvider> near root
  return (
    <Button
      variant="success"
      onClick={() => toast({ tone: "success", title: "Quest completed!" })}
    >
      Complete
    </Button>
  );
}
```

## Project structure

```
src/
  app/
    layout.tsx              # root layout, font, theme bootstrap (no-FOUC)
    page.tsx                # the showcase, mirroring the component board
    _showcase/              # showcase-only demos (not part of the system)
  components/
    index.ts                # public API (barrel export)
    Button/ Badge/ Card/ Form/ Feedback/ Navigation/ ...
                            # each component = .tsx + .module.css, co-located
    Icon.tsx                # dependency-free SVG icon set
  lib/cx.ts                 # tiny className joiner
  styles/
    tokens.css              # the design tokens (3 layers, light + dark)
    globals.css             # reset + the data-state interaction model
```

## Extending

- **New component:** add a folder under `src/components/`, build it from semantic
  tokens, expose `data-*` state attributes, and re-export from `index.ts`.
- **New theme:** add a `[data-theme="..."]` block in `tokens.css` overriding the
  semantic layer only.
- **New intent color:** add a primitive ramp + semantic aliases; components that
  switch on `tone` pick it up via their local component tokens.
