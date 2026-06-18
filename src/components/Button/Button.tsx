"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./Button.module.css";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "subtle"
  | "success"
  | "danger"
  | "warning"
  | "successSoft";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Renders a centered spinner and locks interaction (data-loading). */
  loading?: boolean;
  fullWidth?: boolean;
  /** Square, content-less button sized for a single icon. */
  iconOnly?: boolean;
  /** Circular floating action button. */
  fab?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      iconOnly = false,
      fab = false,
      leadingIcon,
      trailingIcon,
      disabled,
      className,
      children,
      type = "button",
      ...rest
    },
    ref
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cx(
          styles.button,
          styles[size],
          styles[variant],
          fullWidth && styles.fullWidth,
          iconOnly && styles.iconOnly,
          fab && styles.fab,
          className
        )}
        disabled={disabled || loading}
        data-loading={loading || undefined}
        aria-busy={loading || undefined}
        {...rest}
      >
        <span className={cx(styles.content, loading && styles.contentHidden)}>
          {leadingIcon}
          {children}
          {trailingIcon}
        </span>
        {loading && (
          <span className={styles.loadingOverlay} aria-hidden="true">
            <span className={styles.spinner} />
          </span>
        )}
      </button>
    );
  }
);
