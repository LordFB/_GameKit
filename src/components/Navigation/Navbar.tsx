import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "../Icon";
import styles from "./Navbar.module.css";

export interface NavbarProps {
  brand?: ReactNode;
  links?: { label: string; href?: string; active?: boolean }[];
  actions?: ReactNode;
  className?: string;
}

/** Top navigation bar (board: Navbar — "GAME KIT" + Dashboard/Quests/…). */
export function Navbar({ brand, links = [], actions, className }: NavbarProps) {
  return (
    <header className={cx(styles.navbar, className)}>
      <div className={styles.brand}>
        {brand ?? (
          <>
            <span className={styles.logo}>
              <Icon name="gamepad" size={20} />
            </span>
            <span className={styles.brandName}>GAME KIT</span>
          </>
        )}
      </div>
      <nav className={styles.links} aria-label="Primary">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href ?? "#"}
            className={styles.link}
            data-state={l.active ? "selected" : undefined}
            aria-current={l.active ? "page" : undefined}
          >
            {l.label}
          </a>
        ))}
      </nav>
      <div className={styles.actions}>{actions}</div>
    </header>
  );
}
