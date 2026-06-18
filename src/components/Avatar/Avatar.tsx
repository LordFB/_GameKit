import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./Avatar.module.css";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
export type PresenceStatus = "online" | "away" | "busy" | "offline";

export interface AvatarProps {
  src?: string;
  /** Used for initials fallback + alt text. */
  name?: string;
  size?: AvatarSize;
  status?: PresenceStatus;
  /** Emoji or icon shown when there's no image. */
  fallback?: ReactNode;
  ring?: boolean;
}

function initials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function Avatar({
  src,
  name,
  size = "md",
  status,
  fallback,
  ring = false,
}: AvatarProps) {
  return (
    <span
      className={cx(styles.avatar, styles[size], ring && styles.ring)}
      role="img"
      aria-label={name}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name ?? ""} className={styles.img} />
      ) : (
        <span className={styles.fallback}>{fallback ?? initials(name)}</span>
      )}
      {status && (
        <span
          className={cx(styles.status, styles[status])}
          title={status}
          aria-label={status}
        />
      )}
    </span>
  );
}

export interface AvatarGroupProps {
  avatars: AvatarProps[];
  max?: number;
  size?: AvatarSize;
}

/** Overlapping stack with a "+N" overflow chip (board: avatar group). */
export function AvatarGroup({ avatars, max = 4, size = "md" }: AvatarGroupProps) {
  const shown = avatars.slice(0, max);
  const overflow = avatars.length - shown.length;
  return (
    <div className={cx(styles.group, styles[`group_${size}`])}>
      {shown.map((a, i) => (
        <span key={i} className={styles.groupItem}>
          <Avatar {...a} size={size} ring />
        </span>
      ))}
      {overflow > 0 && (
        <span className={cx(styles.groupItem, styles.overflow, styles[size])}>
          +{overflow}
        </span>
      )}
    </div>
  );
}
