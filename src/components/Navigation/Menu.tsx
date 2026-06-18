"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./Menu.module.css";

export interface MenuItem {
  label: ReactNode;
  icon?: ReactNode;
  shortcut?: string;
  tone?: "default" | "danger";
  onSelect?: () => void;
  disabled?: boolean;
}

export interface MenuSection {
  label?: string;
  items: MenuItem[];
}

export interface DropdownMenuProps {
  trigger: ReactNode;
  sections: MenuSection[];
  align?: "start" | "end";
}

/** Dropdown menu (board: Dropdown Menu / avatar menu). Closes on outside click
    and Escape; items grouped into labeled sections. */
export function DropdownMenu({
  trigger,
  sections,
  align = "start",
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.triggerButton}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {trigger}
      </button>
      {open && (
        <div className={cx(styles.menu, styles[align])} role="menu">
          {sections.map((section, si) => (
            <div key={si} className={styles.section}>
              {section.label && (
                <div className={styles.sectionLabel}>{section.label}</div>
              )}
              {section.items.map((item, ii) => (
                <button
                  key={ii}
                  type="button"
                  role="menuitem"
                  className={cx(
                    styles.item,
                    item.tone === "danger" && styles.danger
                  )}
                  disabled={item.disabled}
                  onClick={() => {
                    item.onSelect?.();
                    setOpen(false);
                  }}
                >
                  {item.icon && <span className={styles.itemIcon}>{item.icon}</span>}
                  <span className={styles.itemLabel}>{item.label}</span>
                  {item.shortcut && (
                    <kbd className={styles.shortcut}>{item.shortcut}</kbd>
                  )}
                </button>
              ))}
              {si < sections.length - 1 && <div className={styles.divider} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
