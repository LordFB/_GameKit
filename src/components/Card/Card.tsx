import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./Card.module.css";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds hover lift + pointer affordance for clickable cards. */
  interactive?: boolean;
  /** Persistent selected state (data-state="selected"). */
  selected?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  elevation?: "flat" | "sm" | "md" | "lg";
}

export function Card({
  interactive = false,
  selected = false,
  padding = "md",
  elevation = "sm",
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cx(
        styles.card,
        interactive && styles.interactive,
        styles[`pad_${padding}`],
        styles[`elev_${elevation}`],
        className
      )}
      data-state={selected ? "selected" : undefined}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx(styles.header, className)}>
      <div className={styles.headerText}>
        <div className={styles.title}>{title}</div>
        {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
      </div>
      {action && <div className={styles.headerAction}>{action}</div>}
    </div>
  );
}

export function CardBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cx(styles.body, className)}>{children}</div>;
}

export function CardFooter({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cx(styles.footer, className)}>{children}</div>;
}
