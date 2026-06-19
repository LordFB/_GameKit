"use client";

import { useLayoutEffect } from "react";

type Theme = "light" | "dark";

export function ThemeBootstrap() {
  useLayoutEffect(() => {
    try {
      const stored = localStorage.getItem("gk-theme") as Theme | null;
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.setAttribute(
        "data-theme",
        stored ?? (prefersDark ? "dark" : "light")
      );
    } catch {
      document.documentElement.setAttribute("data-theme", "light");
    }
  }, []);

  return null;
}
