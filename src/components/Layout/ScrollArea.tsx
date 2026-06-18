import type { HTMLAttributes } from "react";
import { cx } from "@/lib/cx";
import styles from "./ScrollArea.module.css";

export interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  maxHeight?: number | string;
}

/** Scroll area with a styled, always-thin scrollbar (board: Scroll Area). */
export function ScrollArea({
  maxHeight = 200,
  className,
  children,
  style,
  ...rest
}: ScrollAreaProps) {
  return (
    <div
      className={cx(styles.area, "gk-scroll", className)}
      style={{ maxHeight, ...style }}
      tabIndex={0}
      {...rest}
    >
      {children}
    </div>
  );
}
