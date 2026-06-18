import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Avatar } from "../Avatar/Avatar";
import styles from "./Leaderboard.module.css";

export interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar?: string;
  score: ReactNode;
  /** Marks the viewer's own row. */
  you?: boolean;
}

/** Leaderboard (board: Leaderboard Widget). Medal styling for top 3. */
export function Leaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <ol className={styles.board}>
      {entries.map((e) => (
        <li
          key={e.rank}
          className={cx(styles.row, e.you && styles.you)}
          data-state={e.you ? "selected" : undefined}
        >
          <span
            className={cx(
              styles.rank,
              e.rank <= 3 && styles[`medal${e.rank}`]
            )}
          >
            {e.rank}
          </span>
          <Avatar src={e.avatar} name={e.name} size="sm" />
          <span className={styles.name}>
            {e.name}
            {e.you && <span className={styles.youTag}>You</span>}
          </span>
          <span className={styles.score}>{e.score}</span>
        </li>
      ))}
    </ol>
  );
}
