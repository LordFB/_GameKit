"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import { Icon, type IconName } from "../Icon";
import styles from "./CommandPalette.module.css";

export interface Command {
  id: string;
  label: string;
  hint?: string;
  icon?: IconName;
  shortcut?: string;
  onRun?: () => void;
}

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: Command[];
  placeholder?: string;
}

/** Command palette (board: Command Palette). Typeahead filter, full keyboard
    navigation (↑/↓/Enter/Esc) — a first-class keyboard surface per spec §2.2. */
export function CommandPalette({
  open,
  onClose,
  commands,
  placeholder = "Type a command or search…",
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [prevQuery, setPrevQuery] = useState(query);
  const [prevOpen, setPrevOpen] = useState(open);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.hint?.toLowerCase().includes(q)
    );
  }, [query, commands]);

  // Reset state on transitions by adjusting during render — React's recommended
  // pattern, which avoids the cascading-render effects lint rule.
  if (query !== prevQuery) {
    setPrevQuery(query);
    setActive(0);
  }
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setQuery("");
      setActive(0);
    }
  }

  // Move focus to the input on open (an external-system sync, not React state).
  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  if (!open) return null;

  function run(cmd?: Command) {
    cmd?.onRun?.();
    onClose();
  }

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={styles.palette} role="dialog" aria-modal="true" aria-label="Command palette">
        <div className={styles.searchRow}>
          <Icon name="search" size={18} className={styles.searchIcon} />
          <input
            ref={inputRef}
            className={styles.input}
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                run(filtered[active]);
              } else if (e.key === "Escape") {
                onClose();
              }
            }}
          />
          <kbd className={styles.esc}>ESC</kbd>
        </div>
        <ul className={cx(styles.results, "gk-scroll")} role="listbox">
          {filtered.length === 0 && (
            <li className={styles.noResults}>No commands found</li>
          )}
          {filtered.map((cmd, i) => (
            <li key={cmd.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                className={cx(styles.item, i === active && styles.itemActive)}
                onMouseEnter={() => setActive(i)}
                onClick={() => run(cmd)}
              >
                <span className={styles.itemIcon}>
                  <Icon name={cmd.icon ?? "chevronRight"} size={16} />
                </span>
                <span className={styles.itemText}>
                  <span className={styles.itemLabel}>{cmd.label}</span>
                  {cmd.hint && <span className={styles.itemHint}>{cmd.hint}</span>}
                </span>
                {cmd.shortcut && (
                  <kbd className={styles.shortcut}>{cmd.shortcut}</kbd>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
