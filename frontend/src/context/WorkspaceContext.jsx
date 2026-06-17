import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import useFileSystem from '../hooks/useFileSystem.js';
import useMonacoModels from '../hooks/useMonacoModels.js';
import detectLanguage from '../utils/languageDetect.js';

const WorkspaceContext = createContext(null);

export const WorkspaceProvider = ({ children }) => {
  const fs = useFileSystem();
  const monacoModels = useMonacoModels();
  
  const [openFiles, setOpenFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  
  const [editorInstance, setEditorInstance] = useState(null);
  const [monacoInstance, setMonacoInstance] = useState(null);

  // Socket and Session ID states to sync file events
  const [socket, setSocket] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  // Shared file tree from session (for guests who do not have local folders open)
  const [sharedFileTree, setSharedFileTree] = useState([]);

  // Clear workspace files state if directory handle is closed
  useEffect(() => {
    if (!fs.dirHandle) {
      setOpenFiles([]);
      setActiveFileId(null);
      monacoModels.clearAll();
    }
  }, [fs.dirHandle, monacoModels]);

  // Share host status (whether this client has a local directory handle)
  useEffect(() => {
    if (socket && sessionId) {
      socket.emit('set-host-status', { sessionId, isHost: !!fs.dirHandle });
    }
  }, [socket, sessionId, fs.dirHandle]);

  // Share file tree from host to other session users
  useEffect(() => {
    if (fs.dirHandle && socket && sessionId && fs.fileTree.length > 0) {
      const cleanTree = (nodes) => {
        return nodes.map(node => ({
          name: node.name,
          type: node.type,
          path: node.path,
          children: node.children ? cleanTree(node.children) : undefined
        }));
      };
      const serializableTree = cleanTree(fs.fileTree);
      socket.emit('update-file-tree', { sessionId, fileTree: serializableTree });
    }
  }, [fs.fileTree, socket, sessionId, fs.dirHandle]);

  // Keep stable refs to avoid stale closure issues in socket listeners
  const saveFileRef = useRef(null);

  // Handle file events sync from other collaborators
  useEffect(() => {
    if (!socket || !sessionId) return;

    const onFileCreated = () => {
      if (fs.dirHandle) fs.refreshTree();
    };

    const onFileDeleted = ({ fileId }) => {
      if (fs.dirHandle) fs.refreshTree();
      
      // If the deleted file is currently open, close it instantly without saving prompts
      setOpenFiles((prev) => {
        const file = prev.find((f) => f.id === fileId);
        if (file) {
          const updated = prev.filter((f) => f.id !== fileId);
          if (activeFileId === fileId) {
            if (updated.length > 0) {
              setActiveFileId(updated[updated.length - 1].id);
            } else {
              setActiveFileId(null);
            }
          }
          monacoModels.removeModel(fileId);
          return updated;
        }
        return prev;
      });
    };

    const onFileRenamed = ({ oldFileId, newFileId }) => {
      if (fs.dirHandle) fs.refreshTree();

      setOpenFiles((prev) =>
        prev.map((f) => {
          if (f.id === oldFileId) {
            const newName = newFileId.split('/').pop();
            const newLang = detectLanguage(newName);
            return {
              ...f,
              id: newFileId,
              path: newFileId,
              name: newName,
              language: newLang
            };
          }
          return f;
        })
      );

      setActiveFileId((prev) => (prev === oldFileId ? newFileId : prev));
    };

    const onFileTreeUpdated = (tree) => {
      setSharedFileTree(tree);
    };

    const onRequestFileContent = async ({ fileId, requesterSocketId }) => {
      if (fs.dirHandle) {
        const content = await fs.readFileContent(fileId);
        socket.emit('provide-file-content', { sessionId, fileId, content, requesterSocketId });
      }
    };

    const onSaveFileToDisk = ({ fileId }) => {
      if (fs.dirHandle && saveFileRef.current) {
        saveFileRef.current(fileId);
      }
    };

    const onRequestFileTree = () => {
      if (fs.dirHandle && fs.fileTree.length > 0) {
        const cleanTree = (nodes) => {
          return nodes.map(node => ({
            name: node.name,
            type: node.type,
            path: node.path,
            children: node.children ? cleanTree(node.children) : undefined
          }));
        };
        const serializableTree = cleanTree(fs.fileTree);
        socket.emit('update-file-tree', { sessionId, fileTree: serializableTree });
      }
    };

    const onCreateFileOnDisk = async ({ name, parentPath }) => {
      if (fs.dirHandle) {
        await fs.createFile(name, parentPath);
      }
    };

    const onCreateFolderOnDisk = async ({ name, parentPath }) => {
      if (fs.dirHandle) {
        await fs.createFolder(name, parentPath);
      }
    };

    const onDeleteEntryOnDisk = async ({ path }) => {
      if (fs.dirHandle) {
        await fs.deleteEntry(path);
      }
    };

    const onRenameEntryOnDisk = async ({ oldPath, newPath }) => {
      if (fs.dirHandle) {
        await fs.renameEntry(oldPath, newPath);
      }
    };

    socket.on('file-created', onFileCreated);
    socket.on('file-deleted', onFileDeleted);
    socket.on('file-renamed', onFileRenamed);
    socket.on('file-tree-updated', onFileTreeUpdated);
    socket.on('request-file-content', onRequestFileContent);
    socket.on('save-file-to-disk', onSaveFileToDisk);
    socket.on('request-file-tree', onRequestFileTree);
    socket.on('create-file-on-disk', onCreateFileOnDisk);
    socket.on('create-folder-on-disk', onCreateFolderOnDisk);
    socket.on('delete-entry-on-disk', onDeleteEntryOnDisk);
    socket.on('rename-entry-on-disk', onRenameEntryOnDisk);

    return () => {
      socket.off('file-created', onFileCreated);
      socket.off('file-deleted', onFileDeleted);
      socket.off('file-renamed', onFileRenamed);
      socket.off('file-tree-updated', onFileTreeUpdated);
      socket.off('request-file-content', onRequestFileContent);
      socket.off('save-file-to-disk', onSaveFileToDisk);
      socket.off('request-file-tree', onRequestFileTree);
      socket.off('create-file-on-disk', onCreateFileOnDisk);
      socket.off('create-folder-on-disk', onCreateFolderOnDisk);
      socket.off('delete-entry-on-disk', onDeleteEntryOnDisk);
      socket.off('rename-entry-on-disk', onRenameEntryOnDisk);
    };
  }, [socket, sessionId, fs, activeFileId, monacoModels]);

  // Open a file tab, reading content from local handle if not already open
  const openFile = async (path) => {
    const existing = openFiles.find((f) => f.id === path);
    if (existing) {
      switchFile(path);
      return;
    }

    const content = await fs.readFileContent(path);
    const name = path.split('/').pop();
    const language = detectLanguage(name);

    const newFile = {
      id: path,
      name,
      path,
      language,
      content,
      isDirty: false
    };

    setOpenFiles((prev) => [...prev, newFile]);
    setActiveFileId(path);
  };

  // Close an open tab, prompting if changes are unsaved
  const closeFile = (fileId) => {
    const file = openFiles.find((f) => f.id === fileId);
    if (!file) return;

    if (file.isDirty) {
      const confirm = window.confirm(`File "${file.name}" has unsaved changes. Close anyway?`);
      if (!confirm) return;
    }

    setOpenFiles((prev) => {
      const updated = prev.filter((f) => f.id !== fileId);
      if (activeFileId === fileId) {
        if (updated.length > 0) {
          setActiveFileId(updated[updated.length - 1].id);
        } else {
          setActiveFileId(null);
        }
      }
      return updated;
    });

    monacoModels.removeModel(fileId);
  };

  // Switch between file tabs, saving current view state first
  const switchFile = (fileId) => {
    if (editorInstance && activeFileId) {
      monacoModels.saveViewState(activeFileId, editorInstance);
    }
    setActiveFileId(fileId);
  };

  // Set unsaved changes indicator for a tab
  const markDirty = (fileId, isDirty = true) => {
    setOpenFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, isDirty } : f))
    );
  };

  const updateFileContent = (fileId, newContent) => {
    setOpenFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, content: newContent } : f))
    );
  };

  // Write file content back to native storage
  const saveFile = async (fileId) => {
    if (!fs.dirHandle) {
      // Guest: request the host to save this file's current state to disk
      if (socket && sessionId) {
        socket.emit('request-save-to-disk', { sessionId, fileId });
      }
      return;
    }

    const file = openFiles.find((f) => f.id === fileId);
    if (!file) return;

    let codeToSave = file.content;
    if (monacoInstance) {
      const model = monacoModels.getOrCreateModel(fileId, file.content, file.language, monacoInstance);
      if (model) {
        codeToSave = model.getValue();
      }
    }

    await fs.saveFileContent(fileId, codeToSave);
    markDirty(fileId, false);
    updateFileContent(fileId, codeToSave);
  };

  // Keep saveFileRef updated with the latest version
  useEffect(() => {
    saveFileRef.current = saveFile;
  }, [saveFile]);

  const saveAllFiles = async () => {
    for (const file of openFiles) {
      if (file.isDirty) {
        await saveFile(file.id);
      }
    }
  };

  // Reorder tabs in the tab bar
  const reorderTabs = (startIndex, endIndex) => {
    setOpenFiles((prev) => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  };

  // Wrap file-system CRUD actions to execute locally (if host) or request the host to execute them (if guest)
  const createFileWrapper = async (name, parentPath = '') => {
    if (!fs.dirHandle) {
      if (socket && sessionId) {
        socket.emit('request-create-file', { sessionId, name, parentPath });
      }
      return null;
    }
    const path = await fs.createFile(name, parentPath);
    if (path && socket && sessionId) {
      socket.emit('file-created', { sessionId, fileId: path, name, type: 'file' });
    }
    return path;
  };

  const createFolderWrapper = async (name, parentPath = '') => {
    if (!fs.dirHandle) {
      if (socket && sessionId) {
        socket.emit('request-create-folder', { sessionId, name, parentPath });
      }
      return null;
    }
    const path = await fs.createFolder(name, parentPath);
    if (path && socket && sessionId) {
      socket.emit('file-created', { sessionId, fileId: path, name, type: 'directory' });
    }
    return path;
  };

  const deleteEntryWrapper = async (path) => {
    if (!fs.dirHandle) {
      if (socket && sessionId) {
        socket.emit('request-delete-entry', { sessionId, path });
      }
      return;
    }
    await fs.deleteEntry(path);
    if (socket && sessionId) {
      socket.emit('file-deleted', { sessionId, fileId: path });
    }
  };

  const renameEntryWrapper = async (oldPath, newPath) => {
    if (!fs.dirHandle) {
      if (socket && sessionId) {
        socket.emit('request-rename-entry', { sessionId, oldPath, newPath });
      }
      return;
    }
    await fs.renameEntry(oldPath, newPath);
    if (socket && sessionId) {
      socket.emit('file-renamed', { sessionId, oldFileId: oldPath, newFileId: newPath });
    }
  };

  const value = {
    ...fs,
    fileTree: fs.dirHandle ? fs.fileTree : sharedFileTree,
    openFiles,
    activeFileId,
    openFile,
    closeFile,
    switchFile,
    markDirty,
    updateFileContent,
    saveFile,
    saveAllFiles,
    reorderTabs,
    createFile: createFileWrapper,
    createFolder: createFolderWrapper,
    deleteEntry: deleteEntryWrapper,
    renameEntry: renameEntryWrapper,
    editorInstance,
    setEditorInstance,
    monacoInstance,
    setMonacoInstance,
    monacoModels,
    setSocket,
    setSessionId
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
