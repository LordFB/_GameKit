import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import { TddToolkit } from "@/components/Tdd";
import { ThemeBootstrap } from "./ThemeBootstrap";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GameKit — CSS-Compatible Game Toolkit Design System",
  description:
    "A sophisticated, extensible, token-driven design system for game toolkits. Stateful components, gamepad-safe focus, light/dark theming.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body>
        <ThemeBootstrap />
        {children}
        {/* Dev-only overlay — renders null in production (see TddToolkit). */}
        <TddToolkit />
      </body>
    </html>
  );
}
