"use client";

import { useState } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "../Icon";
import styles from "./Calendar.module.css";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export interface CalendarProps {
  /** ISO date strings (yyyy-mm-dd) to mark with an event dot. */
  events?: string[];
  defaultDate?: Date;
  onSelect?: (date: Date) => void;
}

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** Calendar / date picker (board: Calendar Widget). Month navigation, today
    highlight, selectable days, event dots. */
export function Calendar({ events = [], defaultDate, onSelect }: CalendarProps) {
  const today = new Date();
  const [view, setView] = useState(defaultDate ?? today);
  const [selected, setSelected] = useState<Date | null>(defaultDate ?? null);
  const eventSet = new Set(events);

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function shift(delta: number) {
    setView(new Date(year, month + delta, 1));
  }

  return (
    <div className={styles.calendar}>
      <div className={styles.header}>
        <span className={styles.monthLabel}>
          {MONTHS[month]} {year}
        </span>
        <div className={styles.nav}>
          <button
            type="button"
            className={styles.navButton}
            onClick={() => shift(-1)}
            aria-label="Previous month"
          >
            <Icon name="chevronLeft" size={16} />
          </button>
          <button
            type="button"
            className={styles.navButton}
            onClick={() => shift(1)}
            aria-label="Next month"
          >
            <Icon name="chevronRight" size={16} />
          </button>
        </div>
      </div>
      <div className={styles.weekdays}>
        {WEEKDAYS.map((d) => (
          <span key={d} className={styles.weekday}>
            {d}
          </span>
        ))}
      </div>
      <div className={styles.grid}>
        {cells.map((day, i) => {
          if (day === null) return <span key={`e${i}`} />;
          const date = new Date(year, month, day);
          const isToday = iso(date) === iso(today);
          const isSelected = selected && iso(date) === iso(selected);
          const hasEvent = eventSet.has(iso(date));
          return (
            <button
              key={day}
              type="button"
              className={cx(
                styles.day,
                isToday && styles.today,
                isSelected && styles.selected
              )}
              data-state={isSelected ? "selected" : undefined}
              aria-current={isToday ? "date" : undefined}
              onClick={() => {
                setSelected(date);
                onSelect?.(date);
              }}
            >
              {day}
              {hasEvent && <span className={styles.eventDot} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
