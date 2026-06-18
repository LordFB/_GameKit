import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "../Icon";
import styles from "./StatCard.module.css";

export interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  tone?: "primary" | "success" | "warning" | "danger";
  /** Signed percentage delta; sign drives up/down styling. */
  trend?: number;
  trendLabel?: string;
}

/** Stat / metric card (board: stat tiles — "7,890 Achievements", etc.). */
export function StatCard({
  label,
  value,
  icon,
  tone = "primary",
  trend,
  trendLabel,
}: StatCardProps) {
  const up = (trend ?? 0) >= 0;
  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <span className={styles.label}>{label}</span>
        {icon && (
          <span className={cx(styles.icon, styles[tone])}>{icon}</span>
        )}
      </div>
      <div className={styles.value}>{value}</div>
      {trend != null && (
        <div className={cx(styles.trend, up ? styles.up : styles.down)}>
          <Icon name={up ? "chevronUp" : "chevronDown"} size={14} />
          {Math.abs(trend)}%
          {trendLabel && <span className={styles.trendLabel}>{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}
