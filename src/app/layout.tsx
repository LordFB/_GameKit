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
  title: "Next TDD toolkit demo - GameKit",
  description:
    "Next.js TDD Toolkit demo built with GameKit, a collection of tools and best practices for building games and interactive experiences with Next.js.",
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
