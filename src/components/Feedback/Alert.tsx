"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon, type IconName } from "../Icon";
import styles from "./Alert.module.css";

export type AlertTone = "info" | "success" | "warning" | "danger";

const toneIcon: Record<AlertTone, IconName> = {
  info: "info",
  success: "check",
  warning: "warning",
  danger: "alert",
};

export interface AlertProps {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  /** Show a close button; alert removes itself when clicked. */
  dismissible?: boolean;
  action?: ReactNode;
  icon?: ReactNode;
}

/** Banner alert (board: Alert Banners). Severity-matched color, icon, and an
    optional next-step action (spec §2.3 feedback hierarchy). */
export function Alert({
  tone = "info",
  title,
  children,
  dismissible = false,
  action,
  icon,
}: AlertProps) {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  return (
    <div className={cx(styles.alert, styles[tone])} role="alert">
      <span className={styles.icon}>
        {icon ?? <Icon name={toneIcon[tone]} size={18} />}
      </span>
      <div className={styles.content}>
        {title && <p className={styles.title}>{title}</p>}
        {children && <p className={styles.body}>{children}</p>}
      </div>
      {action && <div className={styles.action}>{action}</div>}
      {dismissible && (
        <button
          type="button"
          className={styles.close}
          onClick={() => setOpen(false)}
          aria-label="Dismiss"
        >
          <Icon name="close" size={16} />
        </button>
      )}
    </div>
  );
}
