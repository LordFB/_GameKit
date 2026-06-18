"use client";

import { useState } from "react";
import { Icon } from "../Icon";
import styles from "./NumberInput.module.css";

export interface NumberInputProps {
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  "aria-label"?: string;
}

/** Number input with stepper buttons (board: Number Input). Clamps to range and
    disables the steppers at the bounds (locked state). */
export function NumberInput({
  min = -Infinity,
  max = Infinity,
  step = 1,
  value,
  defaultValue = 0,
  onChange,
  disabled,
  "aria-label": ariaLabel,
}: NumberInputProps) {
  const [internal, setInternal] = useState(defaultValue);
  const current = value ?? internal;

  function set(v: number) {
    const clamped = Math.min(max, Math.max(min, v));
    if (value === undefined) setInternal(clamped);
    onChange?.(clamped);
  }

  return (
    <div className={styles.wrapper} data-disabled={disabled || undefined}>
      <button
        type="button"
        className={styles.step}
        onClick={() => set(current - step)}
        disabled={disabled || current <= min}
        aria-label="Decrease"
      >
        <Icon name="minus" size={16} />
      </button>
      <input
        type="number"
        className={styles.input}
        value={current}
        min={min === -Infinity ? undefined : min}
        max={max === Infinity ? undefined : max}
        step={step}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => set(Number(e.target.value))}
      />
      <button
        type="button"
        className={styles.step}
        onClick={() => set(current + step)}
        disabled={disabled || current >= max}
        aria-label="Increase"
      >
        <Icon name="plus" size={16} />
      </button>
    </div>
  );
}
