"use client";

import { useEffect, useRef, useState } from "react";
import { loadMonaco } from "./loader";
import { buildSuggestions, TDD_GLOBALS_DTS } from "./completions";
import type { MonacoApi, MonacoEditorInstance } from "./types";

export function MonacoSnippetEditor({
  value,
  onChange,
  onRun,
  onSave,
  registerInsert,
}: {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  onSave: () => void;
  registerInsert: (fn: ((text: string) => boolean) | null) => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const monacoRef = useRef<MonacoApi | null>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);
  const onSaveRef = useRef(onSave);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Keep the latest props in refs for the long-lived Monaco callbacks (which are
  // wired once on mount). Synced in an effect — not during render — so we never
  // mutate a ref while rendering.
  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
    onRunRef.current = onRun;
    onSaveRef.current = onSave;
  });

  useEffect(() => {
    let cancelled = false;
    let changeSub: { dispose: () => void } | null = null;
    let extraLib: { dispose: () => void } | null = null;
    let completionSub: { dispose: () => void } | null = null;

    loadMonaco().then(
      (monaco) => {
        if (cancelled || !hostRef.current) return;
        monacoRef.current = monaco;
        monaco.editor.defineTheme("tdd-dark", {
          base: "vs-dark",
          inherit: true,
          rules: [
            { token: "comment", foreground: "6b7280", fontStyle: "italic" },
            { token: "string", foreground: "fbbf24" },
            { token: "keyword", foreground: "60a5fa" },
            { token: "number", foreground: "34d399" },
          ],
          colors: {
            "editor.background": "#070a0f",
            "editor.foreground": "#dbeafe",
            "editorLineNumber.foreground": "#475569",
            "editorLineNumber.activeForeground": "#93c5fd",
            "editorCursor.foreground": "#60a5fa",
            "editor.selectionBackground": "#1d4ed880",
            "editor.lineHighlightBackground": "#ffffff08",
          },
        });
        monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
          target: monaco.languages.typescript.ScriptTarget.ESNext,
          moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
          allowNonTsExtensions: true,
          noEmit: true,
          strict: false,
        });
        extraLib = monaco.languages.typescript.typescriptDefaults.addExtraLib(
          TDD_GLOBALS_DTS,
          "file:///tdd-globals.d.ts"
        );
        completionSub = monaco.languages.registerCompletionItemProvider("typescript", {
          triggerCharacters: [".", "p", "e", "t"],
          provideCompletionItems: (
            model: {
              getWordUntilPosition: (position: unknown) => {
                startColumn: number;
                endColumn: number;
              };
            },
            position: { lineNumber: number; column: number }
          ) => {
            const word = model.getWordUntilPosition(position);
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            };
            return { suggestions: buildSuggestions(monaco, range) };
          },
        });

        const editor = monaco.editor.create(hostRef.current, {
          value: valueRef.current,
          language: "typescript",
          theme: "tdd-dark",
          automaticLayout: true,
          minimap: { enabled: false },
          fontFamily: "var(--tdd-font-mono)",
          fontSize: 14,
          lineHeight: 22,
          tabSize: 2,
          insertSpaces: true,
          scrollBeyondLastLine: false,
          renderLineHighlight: "line",
          padding: { top: 12, bottom: 12 },
          wordWrap: "off",
          fixedOverflowWidgets: true,
          suggest: {
            showInlineDetails: true,
            showStatusBar: true,
          },
          quickSuggestions: {
            other: true,
            comments: false,
            strings: true,
          },
        });
        editorRef.current = editor;
        changeSub = editor.onDidChangeModelContent(() => {
          const next = editor.getValue();
          valueRef.current = next;
          onChangeRef.current(next);
        });
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRunRef.current());
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => onSaveRef.current());
      },
      (err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err));
      }
    );

    return () => {
      cancelled = true;
      registerInsert(null);
      changeSub?.dispose();
      extraLib?.dispose();
      completionSub?.dispose();
      editorRef.current?.dispose();
      editorRef.current = null;
    };
  }, [registerInsert]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || editor.getValue() === value) return;
    valueRef.current = value;
    editor.setValue(value);
  }, [value]);

  useEffect(() => {
    registerInsert((text: string) => {
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      const model = editor?.getModel();
      const selection = editor?.getSelection();
      if (!editor || !monaco || !model || !selection) return false;
      const offset = model.getOffsetAt({
        lineNumber: selection.startLineNumber,
        column: selection.startColumn,
      });
      const current = model.getValue();
      const prefix = offset > 0 && current[offset - 1] !== "\n" ? "\n" : "";
      const suffix = text.endsWith("\n") ? "" : "\n";
      editor.executeEdits("tdd-insert", [
        {
          range: new monaco.Range(
            selection.startLineNumber,
            selection.startColumn,
            selection.endLineNumber,
            selection.endColumn
          ),
          text: `${prefix}${text}${suffix}`,
          forceMoveMarkers: true,
        },
      ]);
      editor.focus();
      return true;
    });
    return () => registerInsert(null);
  }, [registerInsert]);

  return (
    <div className="tdd-monaco-shell">
      <div ref={hostRef} className="tdd-monaco-editor" aria-label="Test snippet editor" />
      {loadError && <div className="tdd-monaco-error">{loadError}</div>}
    </div>
  );
}
