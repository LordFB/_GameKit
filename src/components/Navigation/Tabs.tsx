"use client";

import { useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./Tabs.module.css";

export interface TabItem {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  variant?: "underline" | "pill";
  children?: (active: string) => ReactNode;
}

/** Tabs (board: Tabs). Roving-tabindex arrow-key navigation per WAI-ARIA, with
    keyboard/gamepad-safe focus. */
export function Tabs({
  items,
  value,
  defaultValue,
  onChange,
  variant = "underline",
  children,
}: TabsProps) {
  const [internal, setInternal] = useState(defaultValue ?? items[0]?.value);
  const active = value ?? internal;
  const baseId = useId();
  const listRef = useRef<HTMLDivElement>(null);

  function select(v: string) {
    if (value === undefined) setInternal(v);
    onChange?.(v);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const enabled = items.filter((i) => !i.disabled);
    const idx = enabled.findIndex((i) => i.value === active);
    let next = idx;
    if (e.key === "ArrowRight") next = (idx + 1) % enabled.length;
    else if (e.key === "ArrowLeft")
      next = (idx - 1 + enabled.length) % enabled.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = enabled.length - 1;
    else return;
    e.preventDefault();
    const v = enabled[next].value;
    select(v);
    listRef.current
      ?.querySelector<HTMLElement>(`[data-value="${v}"]`)
      ?.focus();
  }

  return (
    <div className={styles.tabs}>
      <div
        ref={listRef}
        role="tablist"
        className={cx(styles.list, styles[variant])}
        onKeyDown={onKeyDown}
      >
        {items.map((item) => {
          const selected = item.value === active;
          return (
            <button
              key={item.value}
              role="tab"
              type="button"
              data-value={item.value}
              id={`${baseId}-tab-${item.value}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.value}`}
              tabIndex={selected ? 0 : -1}
              disabled={item.disabled}
              data-state={selected ? "selected" : undefined}
              className={styles.tab}
              onClick={() => select(item.value)}
            >
              {item.icon}
              {item.label}
              {item.badge != null && (
                <span className={styles.badge}>{item.badge}</span>
              )}
            </button>
          );
        })}
      </div>
      {children && (
        <div
          role="tabpanel"
          id={`${baseId}-panel-${active}`}
          aria-labelledby={`${baseId}-tab-${active}`}
          className={styles.panel}
        >
          {children(active)}
        </div>
      )}
    </div>
  );
}
