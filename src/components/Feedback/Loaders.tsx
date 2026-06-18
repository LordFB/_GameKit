import { cx } from "@/lib/cx";
import styles from "./Loaders.module.css";

export interface SpinnerProps {
  size?: number;
  tone?: "primary" | "neutral" | "current";
  label?: string;
}

/** Loading spinner (board: Spinner). */
export function Spinner({ size = 24, tone = "primary", label }: SpinnerProps) {
  return (
    <span className={styles.spinnerWrap} role="status">
      <span
        className={cx(styles.spinner, styles[tone])}
        style={{ width: size, height: size }}
      />
      {label && <span className={styles.spinnerLabel}>{label}</span>}
      <span className="sr-only">Loading</span>
    </span>
  );
}

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  circle?: boolean;
  className?: string;
}

/** Shimmer skeleton placeholder (board: Skeleton Loader). */
export function Skeleton({
  width,
  height = 16,
  radius,
  circle = false,
  className,
}: SkeletonProps) {
  return (
    <span
      className={cx(styles.skeleton, className)}
      style={{
        width,
        height,
        borderRadius: circle ? "50%" : (radius ?? "var(--radius-sm)"),
      }}
      aria-hidden="true"
    />
  );
}

/** Convenience: a stacked text-block skeleton. */
export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className={styles.skeletonText}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={12} width={i === lines - 1 ? "60%" : "100%"} />
      ))}
    </div>
  );
}
