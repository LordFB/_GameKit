/** Locale-pinned number formatting for SSR-safe rendering.
 *
 * `Number.prototype.toLocaleString()` with no locale uses the *host's* locale,
 * so Node (server) and the browser (client) can pick different group
 * separators ("12,840" vs "12.840") and mismatch on hydration. Always going
 * through this helper guarantees identical output on every machine.
 *
 * The locale is fixed to "en-US" by default; pass `options` for currency,
 * decimals, etc. (still locale-pinned).
 */
const LOCALE = "en-US";

export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  return value.toLocaleString(LOCALE, options);
}
