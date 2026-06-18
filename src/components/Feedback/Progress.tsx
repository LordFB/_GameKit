import { cx } from "@/lib/cx";
import styles from "./Progress.module.css";

export type ProgressTone = "primary" | "success" | "warning" | "danger";

export interface ProgressBarProps {
  value: number;
  max?: number;
  tone?: ProgressTone;
  size?: "sm" | "md";
  showLabel?: boolean;
  /** Animated diagonal stripes for indeterminate-feeling loads. */
  striped?: boolean;
}

export function ProgressBar({
  value,
  max = 100,
  tone = "primary",
  size = "md",
  showLabel = false,
  striped = false,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={styles.barWrapper}>
      <div
        className={cx(styles.bar, styles[size])}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <span
          className={cx(styles.fill, styles[tone], striped && styles.striped)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className={styles.barLabel}>{Math.round(pct)}%</span>
      )}
    </div>
  );
}

export interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  tone?: ProgressTone;
  showLabel?: boolean;
}

/** Circular progress ring (board: Circular Progress). Pure SVG stroke-dashoffset. */
export function CircularProgress({
  value,
  max = 100,
  size = 72,
  tone = "primary",
  showLabel = true,
}: CircularProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const stroke = 7;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className={styles.ringWrapper} style={{ width: size, height: size }}>
      <svg width={size} height={size} className={styles.ring}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--hud-track)"
          strokeWidth={stroke}
        />
        <circle
          className={cx(styles.ringFill, styles[tone])}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {showLabel && (
        <span className={styles.ringLabel}>{Math.round(pct)}%</span>
      )}
    </div>
  );
}
