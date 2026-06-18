"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Icon, type IconName } from "../Icon";
import styles from "./Sidebar.module.css";

export interface SidebarItem {
  label: string;
  icon: IconName;
  badge?: ReactNode;
  value: string;
}

export interface SidebarProps {
  items: SidebarItem[];
  defaultValue?: string;
  footer?: ReactNode;
}

/** Vertical app sidebar (board: Sidebar — Dashboard / Quests / Inventory …).
    Tracks a single active item with persistent selected styling. */
export function Sidebar({ items, defaultValue, footer }: SidebarProps) {
  const [active, setActive] = useState(defaultValue ?? items[0]?.value);

  return (
    <nav className={styles.sidebar} aria-label="Sidebar">
      <ul className={styles.list}>
        {items.map((item) => {
          const selected = item.value === active;
          return (
            <li key={item.value}>
              <button
                type="button"
                className={styles.item}
                data-state={selected ? "selected" : undefined}
                aria-current={selected ? "page" : undefined}
                onClick={() => setActive(item.value)}
              >
                <span className={styles.itemIcon}>
                  <Icon name={item.icon} size={18} />
                </span>
                <span className={styles.itemLabel}>{item.label}</span>
                {item.badge != null && (
                  <span className={styles.itemBadge}>{item.badge}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {footer && <div className={styles.footer}>{footer}</div>}
    </nav>
  );
}
