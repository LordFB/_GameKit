/* Minimal structural types for the slice of the Monaco API the toolkit uses.
   Monaco is loaded from a CDN at runtime (not bundled), so we hand-type only
   what we touch instead of pulling in the full monaco-editor type surface. */

export type MonacoApi = {
  KeyMod: { CtrlCmd: number };
  KeyCode: { Enter: number; KeyS: number };
  Range: new (
    startLineNumber: number,
    startColumn: number,
    endLineNumber: number,
    endColumn: number
  ) => unknown;
  editor: {
    create: (el: HTMLElement, options: Record<string, unknown>) => MonacoEditorInstance;
    defineTheme: (name: string, theme: Record<string, unknown>) => void;
  };
  languages: {
    CompletionItemKind: {
      Snippet: number;
      Function: number;
      Method: number;
      Variable: number;
    };
    CompletionItemInsertTextRule: { InsertAsSnippet: number };
    registerCompletionItemProvider: (
      language: string,
      provider: Record<string, unknown>
    ) => { dispose: () => void };
    typescript: {
      typescriptDefaults: {
        setCompilerOptions: (options: Record<string, unknown>) => void;
        addExtraLib: (source: string, path?: string) => { dispose: () => void };
      };
      ScriptTarget: { ESNext: string };
      ModuleResolutionKind: { NodeJs: string };
    };
  };
};

export type MonacoEditorInstance = {
  dispose: () => void;
  getValue: () => string;
  setValue: (value: string) => void;
  focus: () => void;
  onDidChangeModelContent: (listener: () => void) => { dispose: () => void };
  addCommand: (keybinding: number, handler: () => void) => string | null;
  getModel: () => {
    getValue: () => string;
    getOffsetAt: (position: { lineNumber: number; column: number }) => number;
  } | null;
  getSelection: () => {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  } | null;
  executeEdits: (
    source: string,
    edits: Array<{ range: unknown; text: string; forceMoveMarkers: boolean }>
  ) => void;
};

export interface CompletionRange {
  startLineNumber: number;
  endLineNumber: number;
  startColumn: number;
  endColumn: number;
}

declare global {
  interface Window {
    monaco?: MonacoApi;
    require?: {
      config: (options: Record<string, unknown>) => void;
      (deps: string[], callback: () => void): void;
    };
    __tddMonacoLoader?: Promise<MonacoApi>;
  }
}
