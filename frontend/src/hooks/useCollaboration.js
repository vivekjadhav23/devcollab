import { useEffect, useState, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';

// Base64 conversion helpers
function uint8ArrayToBase64(uint8) {
  let binary = '';
  const len = uint8.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return window.btoa(binary);
}

function base64ToUint8Array(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export default function useCollaboration({ socket, sessionId, editor, activeFileId, monaco, openFiles, monacoModels }) {
  const [roomUsers, setRoomUsers] = useState([]);
  const [remoteCursors, setRemoteCursors] = useState({});
  const editorRef = useRef(editor);
  const ydocsRef = useRef(new Map());
  const bindingRef = useRef(null);

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Keep a mutable ref of openFiles to avoid re-triggering the room setup effect on every keystroke
  const openFilesRef = useRef(openFiles);
  useEffect(() => {
    openFilesRef.current = openFiles;
  }, [openFiles]);

  // Color generator for remote users' cursor outlines
  const getCursorColor = (userId) => {
    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
      '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
    ];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Dispatch cursor location coordinates
  const handleCursorChange = useCallback((position) => {
    if (!socket || !sessionId || !activeFileId || !position) return;
    socket.emit('file-cursors', { sessionId, fileId: activeFileId, position });
  }, [socket, sessionId, activeFileId]);

  // Reset remote cursors when file tab switches
  useEffect(() => {
    setRemoteCursors({});
  }, [activeFileId]);

  // Handle joining/leaving Yjs sync rooms dynamically per file
  useEffect(() => {
    if (!socket || !sessionId || !editor || !activeFileId || !monaco || !monacoModels) return;

    // 1. Leave old Yjs binding if exists
    if (bindingRef.current) {
      bindingRef.current.destroy();
      bindingRef.current = null;
    }

    // 2. Resolve Y.Doc for active file
    let ydoc = ydocsRef.current.get(activeFileId);
    let isNewDoc = false;
    if (!ydoc) {
      ydoc = new Y.Doc();
      ydocsRef.current.set(activeFileId, ydoc);
      isNewDoc = true;
    }
    const ytext = ydoc.getText('codestate');

    // 3. Set Monaco Model (showing local PC file content immediately)
    const activeFile = openFilesRef.current?.find((f) => f.id === activeFileId);
    if (activeFile) {
      const model = monacoModels.getOrCreateModel(activeFileId, activeFile.content, activeFile.language, monaco);
      if (model) {
        editor.setModel(model);
        monacoModels.restoreViewState(activeFileId, editor);

        // If the document was already cached and synchronized, bind immediately
        if (!isNewDoc) {
          const binding = new MonacoBinding(
            ytext,
            model,
            new Set([editor])
          );
          bindingRef.current = binding;
        }
      }
    }

    // 4. Emit join-file to backend with initialContent from local disk
    const initialContent = activeFile ? activeFile.content : '';
    socket.emit('join-file', { sessionId, fileId: activeFileId, initialContent });

    // 5. Handle Yjs updates
    const handleYjsUpdate = (update, origin) => {
      if (origin !== socket) {
        const base64Update = uint8ArrayToBase64(update);
        socket.emit('yjs-update', { sessionId, fileId: activeFileId, update: base64Update });
      }
    };
    ydoc.on('update', handleYjsUpdate);

    // Apply remote updates
    const onYjsUpdate = ({ fileId, update }) => {
      if (fileId === activeFileId) {
        const binaryUpdate = base64ToUint8Array(update);
        Y.applyUpdate(ydoc, binaryUpdate, socket);
      }
    };
    socket.on('yjs-update', onYjsUpdate);

    // Handle code restored events
    const onCodeRestored = ({ fileId, code }) => {
      if (fileId === activeFileId) {
        ydoc.transact(() => {
          ytext.delete(0, ytext.length);
          ytext.insert(0, code);
        }, socket);
      }
    };
    socket.on('code-restored', onCodeRestored);

    // Handle initial state load from socket
    const onFileSessionJoined = ({ fileId, yjsState }) => {
      if (fileId === activeFileId) {
        if (yjsState) {
          const binaryState = base64ToUint8Array(yjsState);
          Y.applyUpdate(ydoc, binaryState, socket);
        }

        // Create Monaco Binding for the first time once Yjs is fully synced
        if (!bindingRef.current) {
          const currentModel = editorRef.current?.getModel();
          if (currentModel && monaco) {
            const modelUri = currentModel.uri.toString();
            const expectedUri = monaco.Uri.file(activeFileId).toString();
            if (modelUri === expectedUri) {
              const binding = new MonacoBinding(
                ytext,
                currentModel,
                new Set([editorRef.current])
              );
              bindingRef.current = binding;
            }
          }
        }
      }
    };
    socket.on('file-session-joined', onFileSessionJoined);

    // Capture remote cursor coordinate feeds
    const onFileCursors = ({ userId, username, avatarUrl, fileId, position }) => {
      if (fileId === activeFileId) {
        setRemoteCursors((prev) => ({
          ...prev,
          [userId]: {
            username,
            avatarUrl,
            position,
            color: getCursorColor(userId),
            lastUpdated: Date.now()
          }
        }));
      }
    };
    socket.on('file-cursors', onFileCursors);

    // Clean up current file listeners
    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
      ydoc.off('update', handleYjsUpdate);
      socket.off('yjs-update', onYjsUpdate);
      socket.off('code-restored', onCodeRestored);
      socket.off('file-session-joined', onFileSessionJoined);
      socket.off('file-cursors', onFileCursors);
      socket.emit('leave-file', { sessionId, fileId: activeFileId });
    };
  }, [socket, sessionId, editor, activeFileId, monaco, monacoModels]);

  // Global session room listeners (collaborators lists)
  useEffect(() => {
    if (!socket || !sessionId) return;

    socket.emit('join-session', { sessionId });

    const onRoomUsers = (users) => {
      setRoomUsers(users);
    };
    socket.on('room-users', onRoomUsers);

    return () => {
      socket.off('room-users', onRoomUsers);
    };
  }, [socket, sessionId]);

  // Clean up cursors on inactivity
  useEffect(() => {
    const cursorCleanUpInterval = setInterval(() => {
      const now = Date.now();
      setRemoteCursors((prev) => {
        const active = {};
        let modified = false;
        Object.entries(prev).forEach(([id, cursor]) => {
          if (now - cursor.lastUpdated < 10000) {
            active[id] = cursor;
          } else {
            modified = true;
          }
        });
        return modified ? active : prev;
      });
    }, 5000);

    return () => clearInterval(cursorCleanUpInterval);
  }, []);

  return {
    roomUsers,
    remoteCursors,
    handleEditorChange: () => {},
    handleCursorChange
  };
}
