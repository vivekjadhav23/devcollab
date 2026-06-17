import React, { useRef, useEffect } from 'react';
import MonacoEditor from '@monaco-editor/react';

export default function Editor({ language, onChange, onCursorChange, onMount, onSave }) {
  const onCursorChangeRef = useRef(onCursorChange);
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onCursorChangeRef.current = onCursorChange;
  }, [onCursorChange]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const handleEditorMount = (editor, monaco) => {
    // Enforce LF (\n) line endings to prevent Windows CRLF desynchronization
    editor.getModel().setEOL(monaco.editor.EndOfLineSequence.LF);

    if (onMount) {
      onMount(editor, monaco);
    }

    // Capture local keyboard shortcut for Save (Ctrl+S / Cmd+S)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (onSaveRef.current) {
        onSaveRef.current();
      }
    });

    // Capture local cursor movement coordinates
    editor.onDidChangeCursorPosition((e) => {
      if (onCursorChangeRef.current) {
        onCursorChangeRef.current(e.position); // e.position contains { lineNumber, column }
      }
    });
  };


  // Modern developer tool style settings
  const editorOptions = {
    fontSize: 14,
    fontFamily: "'Fira Code', 'FiraCode-Retina', Consolas, monospace",
    fontLigatures: true,
    minimap: { enabled: false },
    automaticLayout: true,
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    lineNumbers: 'on',
    renderLineHighlight: 'all',
    scrollbar: {
      vertical: 'visible',
      horizontal: 'visible',
      useShadows: false,
      verticalScrollbarSize: 6,
      horizontalScrollbarSize: 6,
    },
    padding: { top: 12, bottom: 12 },
    tabSize: 2,
    wordWrap: 'on',
    theme: 'vs-dark',
    quickSuggestions: { other: true, comments: false, strings: false },
    hover: { delay: 500 }
  };

  return (
    <div className="monaco-editor-frame">
      <MonacoEditor
        height="100%"
        width="100%"
        theme="vs-dark"
        language={language}
        onChange={onChange}
        onMount={handleEditorMount}
        options={editorOptions}
      />
    </div>
  );
}
