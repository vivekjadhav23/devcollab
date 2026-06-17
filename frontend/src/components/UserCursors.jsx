import React, { useEffect, useRef } from 'react';

export default function UserCursors({ editor, monaco, remoteCursors }) {
  const decorationIdsRef = useRef([]);

  useEffect(() => {
    if (!editor || !monaco || !remoteCursors) return;

    // Apply cursor decorations directly inside Monaco
    const newDecorations = Object.entries(remoteCursors).map(([userId, cursor]) => {
      const { position } = cursor;
      return {
        // Zero-width range represents a single insertion point
        range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
        options: {
          className: `remote-cursor remote-cursor-${userId}`,
          isWholeLine: false,
        }
      };
    });

    // deltaDecorations handles replacing old highlights with the new ones atomically
    decorationIdsRef.current = editor.deltaDecorations(
      decorationIdsRef.current,
      newDecorations
    );

    // Clean up cursor decorations on component unmount
    return () => {
      if (editor && decorationIdsRef.current.length > 0) {
        editor.deltaDecorations(decorationIdsRef.current, []);
        decorationIdsRef.current = [];
      }
    };
  }, [editor, monaco, remoteCursors]);

  // Inject a stylesheet defining customized colored cursor bars and hover labels
  const styleContent = Object.entries(remoteCursors)
    .map(([userId, cursor]) => `
      .remote-cursor-${userId} {
        border-left: 2px solid ${cursor.color} !important;
        margin-left: -1px;
        position: absolute;
      }
      .remote-cursor-${userId}::after {
        content: "${cursor.username}";
        position: absolute;
        top: -16px;
        left: 0;
        background-color: ${cursor.color};
        color: #0a0e17;
        font-family: 'Outfit', sans-serif;
        font-size: 9px;
        font-weight: 600;
        padding: 1px 4px;
        border-radius: 2px;
        white-space: nowrap;
        pointer-events: none;
        opacity: 0.9;
        z-index: 100;
        box-shadow: 0 1px 3px rgba(0,0,0,0.4);
      }
    `)
    .join('\n');

  return <style>{styleContent}</style>;
}
