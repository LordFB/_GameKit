import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "../Icon";
import styles from "./Field.module.css";

export type FieldStatus = "default" | "valid" | "invalid";

export interface FieldProps {
  label?: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  /** Message shown for valid/invalid status (inline validation, spec §2.3). */
  message?: ReactNode;
  status?: FieldStatus;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

/** Shared field shell: label, control slot, and inline validation message.
    Wraps every form control so validation/hint behavior is consistent. */
export function Field({
  label,
  htmlFor,
  hint,
  message,
  status = "default",
  required,
  children,
  className,
}: FieldProps) {
  return (
    <div className={cx(styles.field, className)} data-status={status}>
      {label && (
        <label className={styles.label} htmlFor={htmlFor}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      {children}
      {message && status !== "default" && (
        <p className={cx(styles.message, styles[status])}>
          <Icon
            name={status === "valid" ? "check" : "warning"}
            size={14}
            aria-hidden
          />
          {message}
        </p>
      )}
      {hint && status === "default" && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}
