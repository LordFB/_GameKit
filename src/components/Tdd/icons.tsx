/* ============================================================================
   Dependency-free SVG icons for the TDD toolkit.
   Kept local to the overlay (rather than extending the shared GameKit Icon set)
   so the dev tool stays self-contained. 24x24 stroke paths, currentColor.
   ========================================================================== */

import type { SVGProps } from "react";

const P: Record<string, React.ReactNode> = {
  play: <path d="M7 4v16l13-8z" />,
  run: <path d="M7 4v16l13-8z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  save: (
    <>
      <path d="M5 4h11l3 3v13H5z" />
      <path d="M8 4v5h7M8 14h8v6H8z" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h8" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    </>
  ),
  export: (
    <>
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M5 15v4a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4" />
    </>
  ),
  import: (
    <>
      <path d="M12 15V3M8 11l4 4 4-4" />
      <path d="M5 15v4a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  "chevron-left": <path d="m15 6-6 6 6 6" />,
  "chevron-right": <path d="m9 6 6 6-6 6" />,
  check: <path d="m5 12 4 4L19 7" />,
  cross: <path d="M6 6l12 12M18 6 6 18" />,
  file: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v3M12 20v3M1 12h3M20 12h3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  browser: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
    </>
  ),
  duplicate: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M4 16V6a2 2 0 0 1 2-2h10" />
    </>
  ),
  pencil: (
    <>
      <path d="m4 20 4.2-1L19 8.2a2.8 2.8 0 0 0-4-4L4.2 15z" />
      <path d="m13.5 5.8 4.7 4.7" />
    </>
  ),
  question: (
    <>
      <circle cx="12" cy="12" r="10.5" />
      <g transform="translate(2.4 2.4) scale(0.8)">
        <path strokeWidth={2.5} d="M9.5 9a2.7 2.7 0 1 1 4.3 2.2c-.9.7-1.8 1.2-1.8 2.8" />
        <path strokeWidth={2.5} d="M12 17h.01" />
      </g>
    </>
  ),
};

export type TddIconName = keyof typeof P;

const FILLED = new Set(["play", "run"]);

export function TddIcon({
  name,
  size = 16,
  ...rest
}: { name: TddIconName; size?: number } & SVGProps<SVGSVGElement>) {
  const filled = FILLED.has(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {P[name]}
    </svg>
  );
}
