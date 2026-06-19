import { Icon, ToastProvider } from "@/components";
import { ThemeToggle } from "./_showcase/ThemeToggle";
import { NavigationDemo } from "./_showcase/sections/NavigationDemo";
import { ActionsDemo } from "./_showcase/sections/ActionsDemo";
import { FormDemo } from "./_showcase/sections/FormDemo";
import { FeedbackDemo } from "./_showcase/sections/FeedbackDemo";
import { DataDisplayDemo } from "./_showcase/sections/DataDisplayDemo";
import { MediaDemo } from "./_showcase/sections/MediaDemo";
import { LayoutDemo } from "./_showcase/sections/LayoutDemo";
import styles from "./showcase.module.css";

const palette = [
  { name: "Primary", hex: "#6366F1", token: "--color-primary" },
  { name: "Success", hex: "#22C55E", token: "--color-success" },
  { name: "Warning", hex: "#F59E0B", token: "--color-warning" },
  { name: "Danger", hex: "#EF4444", token: "--color-danger" },
  { name: "Neutral", hex: "#6B7280", token: "--color-neutral" },
];

export default function Home() {
  return (
    <ToastProvider>
      <main className={styles.page}>
        <div className={styles.inner}>
          {/* Masthead */}
          <header className={styles.masthead}>
            <div className={styles.brandRow}>
              <span className={styles.brandMark}>
                <Icon name="gamepad" size={26} />
              </span>
              <div>
                <h1 className={styles.title}>Game Toolkit UI Components</h1>
                <p className={styles.subtitle}>
                  A CSS-compatible, extensible design system — stateful,
                  gamepad-safe, themeable.
                </p>
              </div>
            </div>
            <div className={styles.mastheadActions}>
              <a className={styles.mastheadLink} href="/game-ui">
                Full game UI
              </a>
              <ThemeToggle />
            </div>
          </header>

          {/* Color palette */}
          <div className={styles.palette}>
            {palette.map((c) => (
              <div key={c.name} className={styles.swatch}>
                <span
                  className={styles.swatchDot}
                  style={{ background: `var(${c.token})` }}
                />
                <span className={styles.swatchMeta}>
                  <span className={styles.swatchName}>{c.name}</span>
                  <span className={styles.swatchHex}>{c.hex}</span>
                </span>
              </div>
            ))}
          </div>

          {/* Sections (mirroring the component board) */}
          <NavigationDemo />
          <ActionsDemo />
          <FormDemo />
          <FeedbackDemo />
          <DataDisplayDemo />
          <MediaDemo />
          <LayoutDemo />

          <p className={styles.footerNote}>
            <strong>GameKit</strong> — built with semantic structure, CSS
            variables, and <code>data-state</code> attributes. Override any token
            to re-skin the entire system.
          </p>
        </div>
      </main>
    </ToastProvider>
  );
}
