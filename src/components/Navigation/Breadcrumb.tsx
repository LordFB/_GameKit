import { Fragment } from "react";
import type { ReactNode } from "react";
import { Icon } from "../Icon";
import styles from "./Breadcrumb.module.css";

export interface Crumb {
  label: ReactNode;
  href?: string;
}

/** Breadcrumb trail (board: Breadcrumb). Last item marked as current page. */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className={styles.list}>
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <Fragment key={i}>
              <li className={styles.item}>
                {isLast || !item.href ? (
                  <span
                    className={styles.current}
                    aria-current={isLast ? "page" : undefined}
                  >
                    {item.label}
                  </span>
                ) : (
                  <a className={styles.link} href={item.href}>
                    {item.label}
                  </a>
                )}
              </li>
              {!isLast && (
                <li aria-hidden="true" className={styles.separator}>
                  <Icon name="chevronRight" size={14} />
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
