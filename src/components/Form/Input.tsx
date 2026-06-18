"use client";

import { forwardRef, useState } from "react";
import type {
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
} from "react";
import { cx } from "@/lib/cx";
import { Icon } from "../Icon";
import styles from "./Input.module.css";
import type { FieldStatus } from "./Field";

interface BaseProps {
  status?: FieldStatus;
  inputSize?: "sm" | "md" | "lg";
}

export interface InputProps
  extends InputHTMLAttributes<HTMLInputElement>,
    BaseProps {
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    status = "default",
    inputSize = "md",
    leadingIcon,
    trailingIcon,
    className,
    disabled,
    ...rest
  },
  ref
) {
  return (
    <div
      className={cx(
        styles.shell,
        styles[inputSize],
        styles[`status_${status}`],
        disabled && styles.disabled,
        className
      )}
      data-invalid={status === "invalid" || undefined}
      data-disabled={disabled || undefined}
    >
      {leadingIcon && <span className={styles.affix}>{leadingIcon}</span>}
      <input
        ref={ref}
        className={styles.input}
        disabled={disabled}
        aria-invalid={status === "invalid" || undefined}
        {...rest}
      />
      {trailingIcon && <span className={styles.affix}>{trailingIcon}</span>}
    </div>
  );
});

/** Password field with show/hide toggle (board: Password Field). */
export const PasswordInput = forwardRef<HTMLInputElement, InputProps>(
  function PasswordInput(props, ref) {
    const [show, setShow] = useState(false);
    return (
      <Input
        ref={ref}
        type={show ? "text" : "password"}
        {...props}
        trailingIcon={
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
          >
            <Icon name={show ? "eyeOff" : "eye"} size={16} />
          </button>
        }
      />
    );
  }
);

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement>,
    BaseProps {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ status = "default", className, disabled, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={cx(
          styles.textarea,
          styles[`status_${status}`],
          disabled && styles.disabled,
          className
        )}
        disabled={disabled}
        data-invalid={status === "invalid" || undefined}
        aria-invalid={status === "invalid" || undefined}
        {...rest}
      />
    );
  }
);

export interface SelectProps
  extends SelectHTMLAttributes<HTMLSelectElement>,
    BaseProps {
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
}

/** Native select styled to match the system — gamepad/keyboard accessible by
    default (board: Select Dropdown). */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    {
      status = "default",
      inputSize = "md",
      options,
      placeholder,
      className,
      disabled,
      ...rest
    },
    ref
  ) {
    return (
      <div
        className={cx(
          styles.shell,
          styles[inputSize],
          styles[`status_${status}`],
          disabled && styles.disabled,
          styles.selectShell,
          className
        )}
        data-disabled={disabled || undefined}
      >
        <select
          ref={ref}
          className={styles.select}
          disabled={disabled}
          defaultValue={placeholder ? "" : undefined}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon name="chevronDown" size={16} className={styles.selectChevron} />
      </div>
    );
  }
);
