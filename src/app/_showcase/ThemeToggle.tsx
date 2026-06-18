"use client";

import { useSyncExternalStore } from "react";
import { Button, Icon } from "@/components";

type Theme = "light" | "dark";

/** Subscribe to the <html data-theme> attribute as an external store. Using
    useSyncExternalStore (instead of an effect that setStates) keeps the toggle
    in sync with the value the inline bootstrap script applies before paint. */
function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function getSnapshot(): Theme {
  return (
    (document.documentElement.getAttribute("data-theme") as Theme) ?? "light"
  );
}

/** Persisted light/dark theme switch. Writes data-theme on <html> and stores
    the choice — re-skinning the whole token system at runtime. */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => "light");

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("gk-theme", next);
    } catch {
      /* ignore */
    }
  }

  return (
    <Button
      variant="secondary"
      iconOnly
      onClick={toggle}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
    >
      <Icon name={theme === "light" ? "moon" : "sun"} size={18} />
    </Button>
  );
}
