"use client";

import { useState } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "../Icon";
import styles from "./Pagination.module.css";

export interface PaginationProps {
  total: number;
  page?: number;
  defaultPage?: number;
  onChange?: (page: number) => void;
  siblingCount?: number;
}

function range(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/** Pagination (board: Pagination). Collapses long ranges with ellipses. */
export function Pagination({
  total,
  page,
  defaultPage = 1,
  onChange,
  siblingCount = 1,
}: PaginationProps) {
  const [internal, setInternal] = useState(defaultPage);
  const current = page ?? internal;

  function go(p: number) {
    const clamped = Math.min(total, Math.max(1, p));
    if (page === undefined) setInternal(clamped);
    onChange?.(clamped);
  }

  const pages: (number | "...")[] = [];
  const left = Math.max(2, current - siblingCount);
  const right = Math.min(total - 1, current + siblingCount);
  pages.push(1);
  if (left > 2) pages.push("...");
  pages.push(...range(left, right));
  if (right < total - 1) pages.push("...");
  if (total > 1) pages.push(total);

  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <button
        type="button"
        className={styles.arrow}
        onClick={() => go(current - 1)}
        disabled={current === 1}
        aria-label="Previous page"
      >
        <Icon name="chevronLeft" size={16} />
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`e${i}`} className={styles.ellipsis} aria-hidden>
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            className={cx(styles.page, p === current && styles.active)}
            aria-current={p === current ? "page" : undefined}
            onClick={() => go(p)}
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        className={styles.arrow}
        onClick={() => go(current + 1)}
        disabled={current === total}
        aria-label="Next page"
      >
        <Icon name="chevronRight" size={16} />
      </button>
    </nav>
  );
}
