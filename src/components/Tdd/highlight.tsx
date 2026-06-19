/* ============================================================================
   Tiny JS/TS syntax highlighter
   ----------------------------------------------------------------------------
   Zero-dependency tokenizer used by the editor's highlight layer. It is NOT a
   full parser — it only needs to be good enough to color the test-DSL snippets
   convincingly (the editor is a highlighted <textarea>, not real Monaco, which
   keeps the toolkit dependency-free). Token classes map to .tdd-token-* colors.
   ========================================================================== */

import { Fragment } from "react";
import type { ReactNode } from "react";

const KEYWORDS = new Set([
  "const", "let", "var", "function", "return", "if", "else", "for", "while",
  "await", "async", "new", "true", "false", "null", "undefined", "import",
  "from", "export", "typeof", "instanceof", "of", "in", "try", "catch", "throw",
]);

const BUILTINS = new Set([
  "expect", "test", "it", "screen", "waitFor", "console", "document",
]);

type Tok = { cls: string | null; text: string };

/* Order matters: comments and strings win over identifiers/operators. */
const TOKEN_RE =
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/(?:\\.|[^/\n\\])+\/[gimsuy]*)|(\b\d[\d_.eE+-]*\b)|([A-Za-z_$][\w$]*)|([{}()[\];,.:])|(\s+)/g;

function tokenize(line: string): Tok[] {
  const out: Tok[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(line))) {
    if (m.index > last) out.push({ cls: null, text: line.slice(last, m.index) });
    const [, comment, str, num, ident, punct, ws] = m;
    if (comment) out.push({ cls: "tdd-token-comment", text: comment });
    else if (str) out.push({ cls: "tdd-token-string", text: str });
    else if (num) out.push({ cls: "tdd-token-number", text: num });
    else if (ident) {
      // A name immediately followed by "(" reads as a call/function.
      const after = line.slice(m.index + ident.length).match(/^\s*\(/);
      if (KEYWORDS.has(ident)) out.push({ cls: "tdd-token-keyword", text: ident });
      else if (BUILTINS.has(ident) || after) out.push({ cls: "tdd-token-function", text: ident });
      else out.push({ cls: "tdd-token-variable", text: ident });
    } else if (punct) out.push({ cls: "tdd-token-punctuation", text: punct });
    else if (ws) out.push({ cls: null, text: ws });
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push({ cls: null, text: line.slice(last) });
  return out;
}

/** Render `code` as colored lines for the editor's (pointer-events:none) layer. */
export function highlight(code: string): ReactNode {
  // Keep a trailing empty line so the highlight layer matches the textarea's
  // height exactly (textarea preserves the final newline).
  const lines = code.split("\n");
  return lines.map((line, i) => (
    <span className="tdd-code-line" key={i}>
      {line === "" ? (
        "\n"
      ) : (
        <>
          {tokenize(line).map((t, j) =>
            t.cls ? (
              <span className={t.cls} key={j}>
                {t.text}
              </span>
            ) : (
              <Fragment key={j}>{t.text}</Fragment>
            )
          )}
          {"\n"}
        </>
      )}
    </span>
  ));
}

/** Gutter line-number column, one number per source line. */
export function lineNumbers(code: string): string {
  const count = code.split("\n").length;
  return Array.from({ length: count }, (_, i) => i + 1).join("\n");
}
