import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";

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

/* Read the persisted theme before first paint to avoid a flash of the wrong
   theme. Runs inline in <head>. */
const themeBootstrap = `(function(){try{var t=localStorage.getItem('gk-theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.setAttribute('data-theme', t||(m?'dark':'light'));}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
