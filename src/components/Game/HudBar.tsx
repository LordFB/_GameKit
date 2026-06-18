import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon, type IconName } from "../Icon";
import styles from "./HudBar.module.css";

export type HudResource = "health" | "stamina" | "mana" | "xp";

const resourceIcon: Record<HudResource, IconName> = {
  health: "heart",
  stamina: "sparkles",
  mana: "shield",
  xp: "star",
};

export interface HudBarProps {
  resource: HudResource;
  value: number;
  max: number;
  label?: ReactNode;
  showValue?: boolean;
  icon?: ReactNode;
}

/** Segmented HUD resource bar (board: HUD-style Status — health/stamina/mana/xp).
    Color comes from the --hud-* tokens. */
export function HudBar({
  resource,
  value,
  max,
  label,
  showValue = true,
  icon,
}: HudBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={styles.row}>
      <span className={cx(styles.icon, styles[resource])}>
        {icon ?? <Icon name={resourceIcon[resource]} size={14} filled />}
      </span>
      <div className={styles.barArea}>
        {label && (
          <div className={styles.meta}>
            <span className={styles.label}>{label}</span>
            {showValue && (
              <span className={styles.value}>
                {value}
                <span className={styles.max}> / {max}</span>
              </span>
            )}
          </div>
        )}
        <div
          className={styles.track}
          role="meter"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={resource}
        >
          <span
            className={cx(styles.fill, styles[resource])}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/** Compact HUD panel that stacks several resource bars (a player status block). */
export function HudPanel({
  title,
  level,
  bars,
}: {
  title?: ReactNode;
  level?: number;
  bars: HudBarProps[];
}) {
  return (
    <div className={styles.panel}>
      {(title || level != null) && (
        <div className={styles.panelHead}>
          {title && <span className={styles.panelTitle}>{title}</span>}
          {level != null && <span className={styles.level}>Lv. {level}</span>}
        </div>
      )}
      <div className={styles.bars}>
        {bars.map((b, i) => (
          <HudBar key={i} {...b} />
        ))}
      </div>
    </div>
  );
}
