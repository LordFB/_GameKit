"use client";

import { useState } from "react";
import { cx } from "@/lib/cx";
import styles from "./Slider.module.css";

export interface SliderProps {
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  showValue?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
}

/** Single-thumb slider. The filled track is driven by a CSS variable so styling
    stays pure CSS (board: Slider). */
export function Slider({
  min = 0,
  max = 100,
  step = 1,
  value,
  defaultValue = 50,
  onChange,
  showValue = false,
  disabled,
  "aria-label": ariaLabel,
}: SliderProps) {
  const [internal, setInternal] = useState(defaultValue);
  const current = value ?? internal;
  const pct = ((current - min) / (max - min)) * 100;

  return (
    <div className={styles.wrapper}>
      <div
        className={cx(styles.track, disabled && styles.disabled)}
        style={{ ["--pct" as string]: `${pct}%` }}
      >
        <input
          type="range"
          className={styles.input}
          min={min}
          max={max}
          step={step}
          value={current}
          disabled={disabled}
          aria-label={ariaLabel}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (value === undefined) setInternal(v);
            onChange?.(v);
          }}
        />
      </div>
      {showValue && <output className={styles.value}>{current}</output>}
    </div>
  );
}

export interface RangeSliderProps {
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: [number, number];
  onChange?: (value: [number, number]) => void;
  showValue?: boolean;
}

/** Dual-thumb range (board: Range Slider). */
export function RangeSlider({
  min = 0,
  max = 100,
  step = 1,
  defaultValue = [25, 75],
  onChange,
  showValue = true,
}: RangeSliderProps) {
  const [lo, setLo] = useState(defaultValue[0]);
  const [hi, setHi] = useState(defaultValue[1]);
  const loPct = ((lo - min) / (max - min)) * 100;
  const hiPct = ((hi - min) / (max - min)) * 100;

  return (
    <div className={styles.wrapper}>
      <div
        className={cx(styles.track, styles.rangeTrack)}
        style={{
          ["--lo" as string]: `${loPct}%`,
          ["--hi" as string]: `${hiPct}%`,
        }}
      >
        <input
          type="range"
          className={cx(styles.input, styles.rangeInput)}
          min={min}
          max={max}
          step={step}
          value={lo}
          aria-label="Minimum value"
          onChange={(e) => {
            const v = Math.min(Number(e.target.value), hi - step);
            setLo(v);
            onChange?.([v, hi]);
          }}
        />
        <input
          type="range"
          className={cx(styles.input, styles.rangeInput)}
          min={min}
          max={max}
          step={step}
          value={hi}
          aria-label="Maximum value"
          onChange={(e) => {
            const v = Math.max(Number(e.target.value), lo + step);
            setHi(v);
            onChange?.([lo, v]);
          }}
        />
      </div>
      {showValue && (
        <output className={styles.value}>
          {lo} – {hi}
        </output>
      )}
    </div>
  );
}
