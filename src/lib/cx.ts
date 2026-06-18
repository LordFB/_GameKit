/** Tiny classNames joiner — filters out falsy values. Keeps component markup
    terse without pulling in a dependency. */
export function cx(
  ...args: Array<string | false | null | undefined>
): string {
  return args.filter(Boolean).join(" ");
}
