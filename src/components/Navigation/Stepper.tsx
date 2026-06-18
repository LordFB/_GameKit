import { Fragment } from "react";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "../Icon";
import styles from "./Stepper.module.css";

export interface Step {
  label: ReactNode;
  description?: ReactNode;
}

export interface StepperProps {
  steps: Step[];
  /** Zero-based index of the active step. Earlier steps render as complete. */
  current: number;
}

/** Horizontal stepper (board: Stepper). States: complete / active / upcoming. */
export function Stepper({ steps, current }: StepperProps) {
  return (
    <ol className={styles.stepper}>
      {steps.map((step, i) => {
        const state =
          i < current ? "complete" : i === current ? "active" : "upcoming";
        return (
          <Fragment key={i}>
            <li className={styles.step} data-state={state}>
              <span className={cx(styles.marker, styles[state])}>
                {state === "complete" ? (
                  <Icon name="check" size={15} />
                ) : (
                  i + 1
                )}
              </span>
              <span className={styles.text}>
                <span className={styles.label}>{step.label}</span>
                {step.description && (
                  <span className={styles.description}>{step.description}</span>
                )}
              </span>
            </li>
            {i < steps.length - 1 && (
              <li
                aria-hidden="true"
                className={cx(
                  styles.connector,
                  i < current && styles.connectorDone
                )}
              />
            )}
          </Fragment>
        );
      })}
    </ol>
  );
}
