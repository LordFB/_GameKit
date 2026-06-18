"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "../Icon";
import styles from "./Table.module.css";

export interface Column<T> {
  key: string;
  header: ReactNode;
  /** Render a cell. Defaults to the row's `key` value. */
  cell?: (row: T) => ReactNode;
  sortable?: boolean;
  /** Value used for sorting when `sortable`. */
  sortValue?: (row: T) => string | number;
  align?: "left" | "right" | "center";
  width?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  /** Highlight a row as selected (data-state="selected"). */
  selectedKey?: string | number;
  onRowClick?: (row: T) => void;
}

/** Data table (board: Data Table) with client-side column sorting, hover and
    selected row states. */
export function Table<T>({
  columns,
  data,
  rowKey,
  selectedKey,
  onRowClick,
}: TableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(
    null
  );

  const sorted = useMemo(() => {
    if (!sort) return data;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return data;
    const out = [...data].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return out;
  }, [data, sort, columns]);

  function toggleSort(key: string) {
    setSort((prev) =>
      prev?.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  }

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cx(styles.th, col.align && styles[col.align])}
                style={{ width: col.width }}
                aria-sort={
                  sort?.key === col.key
                    ? sort.dir === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                {col.sortable ? (
                  <button
                    type="button"
                    className={styles.sortButton}
                    onClick={() => toggleSort(col.key)}
                  >
                    {col.header}
                    <Icon
                      name={
                        sort?.key === col.key && sort.dir === "desc"
                          ? "chevronDown"
                          : "chevronUp"
                      }
                      size={13}
                      className={cx(
                        styles.sortIcon,
                        sort?.key === col.key && styles.sortActive
                      )}
                    />
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const key = rowKey(row);
            return (
              <tr
                key={key}
                className={cx(styles.tr, onRowClick && styles.clickable)}
                data-state={key === selectedKey ? "selected" : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cx(styles.td, col.align && styles[col.align])}
                  >
                    {col.cell
                      ? col.cell(row)
                      : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
