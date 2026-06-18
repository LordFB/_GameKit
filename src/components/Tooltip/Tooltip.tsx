"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./Tooltip.module.css";

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}

/** Accessible tooltip: opens on hover AND focus (spec §2.1 — no hover-only
    behavior). Dismisses on Escape. */
export function Tooltip({ content, children, side = "top" }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span
      className={styles.wrapper}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
    >
      <span aria-describedby={open ? id : undefined}>{children}</span>
      <span
        role="tooltip"
        id={id}
        className={cx(styles.tip, styles[side])}
        data-open={open || undefined}
        hidden={!open}
      >
        {content}
      </span>
    </span>
  );
}
