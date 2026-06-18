"use client";

import { forwardRef, useState } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "../Icon";
import styles from "./Choice.module.css";

interface ChoiceProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  description?: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, ChoiceProps>(
  function Checkbox({ label, description, className, disabled, ...rest }, ref) {
    return (
      <label
        className={cx(styles.choice, disabled && styles.disabled, className)}
      >
        <span className={styles.checkboxBox}>
          <input
            ref={ref}
            type="checkbox"
            className={styles.input}
            disabled={disabled}
            {...rest}
          />
          <span className={cx(styles.control, styles.checkbox)}>
            <Icon name="check" size={13} className={styles.checkIcon} />
          </span>
        </span>
        {(label || description) && (
          <span className={styles.text}>
            {label && <span className={styles.label}>{label}</span>}
            {description && (
              <span className={styles.description}>{description}</span>
            )}
          </span>
        )}
      </label>
    );
  }
);

export const Radio = forwardRef<HTMLInputElement, ChoiceProps>(function Radio(
  { label, description, className, disabled, ...rest },
  ref
) {
  return (
    <label className={cx(styles.choice, disabled && styles.disabled, className)}>
      <span className={styles.checkboxBox}>
        <input
          ref={ref}
          type="radio"
          className={styles.input}
          disabled={disabled}
          {...rest}
        />
        <span className={cx(styles.control, styles.radio)}>
          <span className={styles.radioDot} />
        </span>
      </span>
      {(label || description) && (
        <span className={styles.text}>
          {label && <span className={styles.label}>{label}</span>}
          {description && (
            <span className={styles.description}>{description}</span>
          )}
        </span>
      )}
    </label>
  );
});

export interface RadioGroupProps {
  name: string;
  options: { value: string; label: ReactNode; disabled?: boolean }[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  orientation?: "horizontal" | "vertical";
}

export function RadioGroup({
  name,
  options,
  value,
  defaultValue,
  onChange,
  orientation = "horizontal",
}: RadioGroupProps) {
  const [internal, setInternal] = useState(defaultValue);
  const active = value ?? internal;
  return (
    <div
      role="radiogroup"
      className={cx(styles.group, styles[orientation])}
    >
      {options.map((o) => (
        <Radio
          key={o.value}
          name={name}
          value={o.value}
          label={o.label}
          disabled={o.disabled}
          checked={active === o.value}
          onChange={() => {
            if (value === undefined) setInternal(o.value);
            onChange?.(o.value);
          }}
        />
      ))}
    </div>
  );
}

export interface SwitchProps extends Omit<ChoiceProps, "size"> {
  size?: "sm" | "md";
}

/** Toggle switch (board: Toggle Switch). Reflects checked state and is fully
    keyboard operable as a native checkbox. */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { label, description, size = "md", className, disabled, ...rest },
  ref
) {
  return (
    <label className={cx(styles.choice, disabled && styles.disabled, className)}>
      <span className={cx(styles.switchBox, styles[`switch_${size}`])}>
        <input
          ref={ref}
          type="checkbox"
          role="switch"
          className={styles.input}
          disabled={disabled}
          {...rest}
        />
        <span className={styles.switchTrack}>
          <span className={styles.switchThumb} />
        </span>
      </span>
      {(label || description) && (
        <span className={styles.text}>
          {label && <span className={styles.label}>{label}</span>}
          {description && (
            <span className={styles.description}>{description}</span>
          )}
        </span>
      )}
    </label>
  );
});
