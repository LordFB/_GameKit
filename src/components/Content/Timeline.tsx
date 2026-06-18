import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon, type IconName } from "../Icon";
import styles from "./Timeline.module.css";

export type TimelineStatus = "complete" | "active" | "pending";

export interface TimelineEntry {
  title: ReactNode;
  meta?: ReactNode;
  description?: ReactNode;
  status?: TimelineStatus;
  icon?: IconName;
}

/** Vertical timeline (board: Timeline — quest log: Started / In progress / …). */
export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <ol className={styles.timeline}>
      {entries.map((e, i) => {
        const status = e.status ?? "pending";
        return (
          <li key={i} className={styles.entry} data-state={status}>
            <span className={cx(styles.node, styles[status])}>
              {status === "complete" ? (
                <Icon name="check" size={12} />
              ) : e.icon ? (
                <Icon name={e.icon} size={12} />
              ) : (
                <span className={styles.dot} />
              )}
            </span>
            <div className={styles.content}>
              <div className={styles.head}>
                <span className={styles.title}>{e.title}</span>
                {e.meta && <span className={styles.meta}>{e.meta}</span>}
              </div>
              {e.description && (
                <p className={styles.description}>{e.description}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
