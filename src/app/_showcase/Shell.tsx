import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "../showcase.module.css";

export function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <span className={styles.sectionNumber}>{number}</span>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <span className={styles.sectionRule} />
      </div>
      {children}
    </section>
  );
}

export function Tile({
  label,
  span2 = false,
  stack = true,
  children,
  className,
}: {
  label: string;
  span2?: boolean;
  stack?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx(styles.tile, span2 && styles.tileSpan2, className)}>
      <span className={styles.tileLabel}>{label}</span>
      <div className={stack ? styles.tileStack : styles.tileBody}>
        {children}
      </div>
    </div>
  );
}

export const showcaseStyles = styles;
