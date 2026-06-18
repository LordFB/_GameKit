"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "./Button";
import { Icon } from "../Icon";
import styles from "./ButtonGroup.module.css";

export interface SegmentedItem {
  value: string;
  label?: ReactNode;
  icon?: ReactNode;
}

export interface ButtonGroupProps {
  items: SegmentedItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  "aria-label"?: string;
}

/** Segmented control — a single-select group with a persistent "selected"
    state (board: Left / Middle / Right). */
export function ButtonGroup({
  items,
  value,
  defaultValue,
  onChange,
  "aria-label": ariaLabel = "Segmented control",
}: ButtonGroupProps) {
  const [internal, setInternal] = useState(defaultValue ?? items[0]?.value);
  const active = value ?? internal;

  function select(v: string) {
    if (value === undefined) setInternal(v);
    onChange?.(v);
  }

  return (
    <div className={styles.group} role="group" aria-label={ariaLabel}>
      {items.map((item) => {
        const selected = item.value === active;
        return (
          <button
            key={item.value}
            type="button"
            className={styles.segment}
            data-state={selected ? "selected" : undefined}
            aria-pressed={selected}
            onClick={() => select(item.value)}
          >
            {item.icon}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export interface SplitButtonProps {
  children: ReactNode;
  onClick?: () => void;
  onMenu?: () => void;
  variant?: "primary" | "secondary";
}

/** Split button — primary action + an attached menu trigger (board: Save ▾). */
export function SplitButton({
  children,
  onClick,
  onMenu,
  variant = "primary",
}: SplitButtonProps) {
  return (
    <div className={styles.split}>
      <Button variant={variant} className={styles.splitMain} onClick={onClick}>
        {children}
      </Button>
      <Button
        variant={variant}
        iconOnly
        className={styles.splitMenu}
        aria-label="More options"
        onClick={onMenu}
      >
        <Icon name="chevronDown" size={16} />
      </Button>
    </div>
  );
}
