"use client";

import { useState } from "react";
import styles from "./ColorPicker.module.css";

export interface ColorPickerProps {
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
}

/** Native color input wrapped in a token-styled swatch + hex readout
    (board: Color Picker). */
export function ColorPicker({
  defaultValue = "#6366F1",
  value,
  onChange,
}: ColorPickerProps) {
  const [internal, setInternal] = useState(defaultValue);
  const current = (value ?? internal).toUpperCase();

  return (
    <label className={styles.wrapper}>
      <span className={styles.swatch} style={{ background: current }}>
        <input
          type="color"
          className={styles.input}
          value={current}
          onChange={(e) => {
            if (value === undefined) setInternal(e.target.value);
            onChange?.(e.target.value);
          }}
          aria-label="Pick a color"
        />
      </span>
      <span className={styles.hex}>{current}</span>
    </label>
  );
}
