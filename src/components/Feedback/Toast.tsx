"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon, type IconName } from "../Icon";
import styles from "./Toast.module.css";

export type ToastTone = "neutral" | "info" | "success" | "warning" | "danger";

export interface ToastOptions {
  title: ReactNode;
  description?: ReactNode;
  tone?: ToastTone;
  icon?: ReactNode;
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
}

interface ToastContextValue {
  toast: (opts: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneIcon: Record<ToastTone, IconName> = {
  neutral: "info",
  info: "info",
  success: "check",
  warning: "warning",
  danger: "alert",
};

let counter = 0;

/** Toast provider — lightweight queue with auto-dismiss. Mount once near the
    app root; call useToast() anywhere to enqueue (spec §2.3 toast layer). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (opts: ToastOptions) => {
      const id = ++counter;
      const item: ToastItem = { tone: "neutral", duration: 4000, ...opts, id };
      setItems((prev) => [...prev, item]);
      if (item.duration && item.duration > 0) {
        setTimeout(() => remove(id), item.duration);
      }
    },
    [remove]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.viewport} role="region" aria-label="Notifications">
        {items.map((t) => (
          <ToastCard key={t.id} item={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

function ToastCard({
  item,
  onClose,
}: {
  item: ToastItem;
  onClose: () => void;
}) {
  const tone = item.tone ?? "neutral";
  return (
    <div className={cx(styles.toast, styles[tone])} role="status">
      <span className={styles.icon}>
        {item.icon ?? <Icon name={toneIcon[tone]} size={18} />}
      </span>
      <div className={styles.content}>
        <p className={styles.title}>{item.title}</p>
        {item.description && (
          <p className={styles.description}>{item.description}</p>
        )}
      </div>
      <button
        type="button"
        className={styles.close}
        onClick={onClose}
        aria-label="Dismiss notification"
      >
        <Icon name="close" size={15} />
      </button>
    </div>
  );
}
