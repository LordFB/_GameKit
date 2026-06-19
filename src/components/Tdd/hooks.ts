"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Calls `onEscape` when Escape is pressed, but only while `active`. Each modal
 * owns its own handler, so there's no precedence ladder where a stale closure
 * lets Escape close the wrong layer. Listeners attach during the capture phase
 * and the topmost layer (highest in the DOM order of registration) handles it.
 */
export function useEscape(active: boolean, onEscape: () => void): void {
  const onEscapeRef = useRef(onEscape);
  useEffect(() => {
    onEscapeRef.current = onEscape;
  });

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onEscapeRef.current();
    };
    // Capture phase + stopPropagation lets the most-recently-mounted overlay
    // win when several are open at once.
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [active]);
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Traps Tab focus inside the returned container while `active`, focuses the
 * first focusable element on open, and restores focus to whatever was focused
 * before the modal opened when it closes. Returns a ref to attach to the modal
 * root.
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const containerRef = useRef<T | null>(null);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );

    // Move focus inside on open.
    const initial = focusables();
    (initial[0] ?? container).focus({ preventScroll: true });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const activeEl = document.activeElement;
      if (e.shiftKey && activeEl === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener("keydown", onKeyDown);
    return () => {
      container.removeEventListener("keydown", onKeyDown);
      // Restore focus to the trigger so keyboard users land where they left.
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [active]);

  return containerRef;
}

/**
 * Copy text to the clipboard with a legacy fallback for non-secure contexts
 * (where `navigator.clipboard` is undefined). Returns whether the copy
 * succeeded so callers can surface real feedback instead of silently no-opping.
 */
export async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to execCommand
    }
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.setAttribute("readonly", "");
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Tracks which key was most recently copied and clears it after `timeoutMs`.
 * `copy` reports failure (e.g. clipboard blocked) so the UI can react.
 */
export function useCopyFeedback(timeoutMs = 1200) {
  const [copied, setCopied] = useState<string | null>(null);
  const [copyFailed, setCopyFailed] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const copy = useCallback(
    async (text: string, key: string) => {
      const ok = await copyText(text);
      if (timer.current) clearTimeout(timer.current);
      if (ok) {
        setCopyFailed(null);
        setCopied(key);
        timer.current = setTimeout(() => setCopied((c) => (c === key ? null : c)), timeoutMs);
      } else {
        setCopyFailed(key);
        timer.current = setTimeout(
          () => setCopyFailed((c) => (c === key ? null : c)),
          timeoutMs * 2
        );
      }
      return ok;
    },
    [timeoutMs]
  );

  return { copied, copyFailed, copy };
}
