"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "../Icon";
import styles from "./Carousel.module.css";

export interface CarouselSlide {
  id: string;
  /** Any CSS background (gradient/image). */
  background: string;
  title?: ReactNode;
  caption?: ReactNode;
}

/** Image carousel (board: Carousel). Arrow + dot navigation, keyboard arrows,
    and a play overlay affordance. */
export function Carousel({ slides }: { slides: CarouselSlide[] }) {
  const [index, setIndex] = useState(0);
  const go = (i: number) => setIndex((i + slides.length) % slides.length);

  return (
    <div
      className={styles.carousel}
      role="region"
      aria-roledescription="carousel"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
      tabIndex={0}
    >
      <div
        className={styles.viewport}
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((s) => (
          <div
            key={s.id}
            className={styles.slide}
            style={{ background: s.background }}
            aria-hidden={slides[index].id !== s.id}
          >
            <span className={styles.playOverlay}>
              <Icon name="play" size={22} />
            </span>
            {(s.title || s.caption) && (
              <div className={styles.caption}>
                {s.title && <p className={styles.title}>{s.title}</p>}
                {s.caption && <p className={styles.subtitle}>{s.caption}</p>}
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        className={cx(styles.arrow, styles.prev)}
        onClick={() => go(index - 1)}
        aria-label="Previous slide"
      >
        <Icon name="chevronLeft" size={18} />
      </button>
      <button
        type="button"
        className={cx(styles.arrow, styles.next)}
        onClick={() => go(index + 1)}
        aria-label="Next slide"
      >
        <Icon name="chevronRight" size={18} />
      </button>

      <div className={styles.dots}>
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={cx(styles.dot, i === index && styles.dotActive)}
            onClick={() => go(i)}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === index}
          />
        ))}
      </div>
    </div>
  );
}
