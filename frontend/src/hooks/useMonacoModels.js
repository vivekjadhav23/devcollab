import { useRef, useCallback, useMemo } from 'react';

export default function useMonacoModels() {
  const modelsRef = useRef(new Map());
  const viewStatesRef = useRef(new Map());

  // Retrieve existing or create a new Monaco model for a specific file
  const getOrCreateModel = useCallback((fileId, content, language, monaco) => {
    if (!monaco) return null;

    let model = modelsRef.current.get(fileId);
    if (!model) {
      const uri = monaco.Uri.file(fileId);
      // Double check if model already exists globally in monaco
      model = monaco.editor.getModel(uri);
      if (!model) {
        model = monaco.editor.createModel(content, language, uri);
        model.setEOL(monaco.editor.EndOfLineSequence.LF);
      }
      modelsRef.current.set(fileId, model);
    }
    return model;
  }, []);

  // Dispose and remove model state when closing a file tab
  const removeModel = useCallback((fileId) => {
    const model = modelsRef.current.get(fileId);
    if (model) {
      model.dispose();
      modelsRef.current.delete(fileId);
    }
    viewStatesRef.current.delete(fileId);
  }, []);

  // Save active cursor, selections, and scroll coordinates for a file
  const saveViewState = useCallback((fileId, editor) => {
    if (!editor || !fileId) return;
    const state = editor.saveViewState();
    viewStatesRef.current.set(fileId, state);
  }, []);

  // Restore active cursor, selections, and scroll coordinates for a file
  const restoreViewState = useCallback((fileId, editor) => {
    if (!editor || !fileId) return;
    const state = viewStatesRef.current.get(fileId);
    if (state) {
      editor.restoreViewState(state);
    }
  }, []);

  // Clear all models from memory (on session leave)
  const clearAll = useCallback(() => {
    modelsRef.current.forEach((model) => {
      model.dispose();
    });
    modelsRef.current.clear();
    viewStatesRef.current.clear();
  }, []);

  return useMemo(() => ({
    getOrCreateModel,
    removeModel,
    saveViewState,
    restoreViewState,
    clearAll
  }), [getOrCreateModel, removeModel, saveViewState, restoreViewState, clearAll]);
}

