import { useState, useCallback, useEffect } from 'react';
import { get, set, del } from 'idb-keyval';

// Traversal helper to resolve a directory handle from a relative path
async function getDirHandleForPath(rootHandle, path) {
  if (!path) return rootHandle;
  const parts = path.split('/');
  let current = rootHandle;
  for (const part of parts) {
    if (part) {
      current = await current.getDirectoryHandle(part);
    }
  }
  return current;
}

// Recursive builder to parse the local filesystem tree
async function getFileTree(dirHandle, fileHandlesMap, path = '') {
  const tree = [];
  for await (const [name, handle] of dirHandle.entries()) {
    const relativePath = path ? `${path}/${name}` : name;
    if (handle.kind === 'directory') {
      const children = await getFileTree(handle, fileHandlesMap, relativePath);
      tree.push({
        name,
        type: 'directory',
        path: relativePath,
        handle,
        children
      });
    } else {
      fileHandlesMap.set(relativePath, handle);
      tree.push({
        name,
        type: 'file',
        path: relativePath,
        handle
      });
    }
  }
  return tree.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export default function useFileSystem() {
  const [dirHandle, setDirHandle] = useState(null);
  const [fileTree, setFileTree] = useState([]);
  const [fileHandles] = useState(() => new Map());
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [isUnsupported, setIsUnsupported] = useState(false);

  // Fallback state for unsupported browsers (Firefox)
  const [fallbackFiles, setFallbackFiles] = useState([]);

  useEffect(() => {
    // Detect browser support
    if (!('showDirectoryPicker' in window)) {
      setIsUnsupported(true);
    } else {
      // Load saved directory handle from IndexedDB
      get('root_directory_handle')
        .then((savedHandle) => {
          if (savedHandle) {
            setDirHandle(savedHandle);
            setNeedsReconnect(true);
          }
        })
        .catch((err) => console.error('Failed to load saved directory handle:', err));
    }
  }, []);

  // Verify and request permissions for directory handles
  const verifyPermission = useCallback(async (handle, readWrite) => {
    const options = {};
    if (readWrite) {
      options.mode = 'readwrite';
    }
    if ((await handle.queryPermission(options)) === 'granted') {
      return true;
    }
    if ((await handle.requestPermission(options)) === 'granted') {
      return true;
    }
    return false;
  }, []);

  // Parse directory and update tree state
  const refreshTree = useCallback(async (customHandle = dirHandle) => {
    if (!customHandle) return;
    try {
      fileHandles.clear();
      const tree = await getFileTree(customHandle, fileHandles);
      setFileTree(tree);
    } catch (err) {
      console.error('Error refreshing file tree:', err);
    }
  }, [dirHandle, fileHandles]);

  // Open directory picker
  const openFolder = useCallback(async () => {
    if (isUnsupported) {
      // Firefox fallback: trigger invisible multiple file input click
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.webkitdirectory = true;
      input.onchange = async (e) => {
        const files = Array.from(e.target.files);
        const fallbackList = files.map((file) => ({
          name: file.name,
          path: file.webkitRelativePath || file.name,
          type: 'file',
          content: '',
          fileObj: file
        }));
        
        // Load text contents asynchronously
        for (const item of fallbackList) {
          item.content = await item.fileObj.text();
        }

        setFallbackFiles(fallbackList);
        
        // Build a flat/nested tree representation
        const tree = fallbackList.map((item) => ({
          name: item.name,
          path: item.path,
          type: 'file',
          fallback: true
        }));
        setFileTree(tree);
      };
      input.click();
      return;
    }

    try {
      const handle = await window.showDirectoryPicker();
      const allowed = await verifyPermission(handle, true);
      if (allowed) {
        setDirHandle(handle);
        await set('root_directory_handle', handle);
        setNeedsReconnect(false);
        await refreshTree(handle);
      }
    } catch (err) {
      console.error('Directory selection aborted or failed:', err);
    }
  }, [isUnsupported, verifyPermission, refreshTree]);

  // Re-request permissions on a stored folder handle
  const reconnectFolder = useCallback(async () => {
    if (!dirHandle) return;
    try {
      const allowed = await verifyPermission(dirHandle, true);
      if (allowed) {
        setNeedsReconnect(false);
        await refreshTree(dirHandle);
      }
    } catch (err) {
      console.error('Directory reconnection failed:', err);
    }
  }, [dirHandle, verifyPermission, refreshTree]);

  // Read file contents from handle
  const readFileContent = useCallback(async (path) => {
    if (isUnsupported) {
      const fallbackFile = fallbackFiles.find((f) => f.path === path);
      return fallbackFile ? fallbackFile.content : '';
    }

    const handle = fileHandles.get(path);
    if (!handle) return '';
    try {
      const file = await handle.getFile();
      return await file.text();
    } catch (err) {
      console.error(`Error reading file "${path}":`, err);
      return '';
    }
  }, [isUnsupported, fallbackFiles, fileHandles]);

  // Write content back to local file handle
  const saveFileContent = useCallback(async (path, content) => {
    if (isUnsupported) {
      // Fallback: update local content state
      setFallbackFiles((prev) =>
        prev.map((f) => (f.path === path ? { ...f, content } : f))
      );
      
      // Trigger browser download for fallback
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = path.split('/').pop();
      link.click();
      URL.revokeObjectURL(url);
      return;
    }

    const handle = fileHandles.get(path);
    if (!handle) return;
    try {
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
    } catch (err) {
      console.error(`Error writing to file "${path}":`, err);
    }
  }, [isUnsupported, fileHandles]);

  // Create empty file under parent directory
  const createFile = useCallback(async (name, parentPath = '') => {
    if (isUnsupported) {
      const fullPath = parentPath ? `${parentPath}/${name}` : name;
      setFallbackFiles((prev) => [
        ...prev,
        { name, path: fullPath, type: 'file', content: '' }
      ]);
      setFileTree((prev) => [
        ...prev,
        { name, path: fullPath, type: 'file', fallback: true }
      ]);
      return fullPath;
    }

    if (!dirHandle) return;
    try {
      const parentDir = await getDirHandleForPath(dirHandle, parentPath);
      const newFileHandle = await parentDir.getFileHandle(name, { create: true });
      const relativePath = parentPath ? `${parentPath}/${name}` : name;
      fileHandles.set(relativePath, newFileHandle);
      await refreshTree();
      return relativePath;
    } catch (err) {
      console.error('Error creating file:', err);
    }
  }, [dirHandle, isUnsupported, fileHandles, refreshTree]);

  // Create empty folder under parent directory
  const createFolder = useCallback(async (name, parentPath = '') => {
    if (isUnsupported) {
      const fullPath = parentPath ? `${parentPath}/${name}` : name;
      setFileTree((prev) => [
        ...prev,
        { name, path: fullPath, type: 'directory', children: [], fallback: true }
      ]);
      return fullPath;
    }

    if (!dirHandle) return;
    try {
      const parentDir = await getDirHandleForPath(dirHandle, parentPath);
      await parentDir.getDirectoryHandle(name, { create: true });
      await refreshTree();
      return parentPath ? `${parentPath}/${name}` : name;
    } catch (err) {
      console.error('Error creating folder:', err);
    }
  }, [dirHandle, isUnsupported, refreshTree]);

  // Delete file or folder entry recursively
  const deleteEntry = useCallback(async (path) => {
    if (isUnsupported) {
      setFallbackFiles((prev) => prev.filter((f) => f.path !== path));
      setFileTree((prev) => prev.filter((f) => f.path !== path));
      return;
    }

    if (!dirHandle) return;
    try {
      const parts = path.split('/');
      const name = parts.pop();
      const parentPath = parts.join('/');
      
      const parentDir = await getDirHandleForPath(dirHandle, parentPath);
      await parentDir.removeEntry(name, { recursive: true });
      fileHandles.delete(path);
      await refreshTree();
    } catch (err) {
      console.error(`Error deleting entry "${path}":`, err);
    }
  }, [dirHandle, isUnsupported, fileHandles, refreshTree]);

  // Rename a file (read content, create new, write, delete old)
  const renameEntry = useCallback(async (oldPath, newPath) => {
    if (isUnsupported) {
      setFallbackFiles((prev) =>
        prev.map((f) => (f.path === oldPath ? { ...f, path: newPath, name: newPath.split('/').pop() } : f))
      );
      setFileTree((prev) =>
        prev.map((f) => (f.path === oldPath ? { ...f, path: newPath, name: newPath.split('/').pop() } : f))
      );
      return;
    }

    if (!dirHandle) return;
    try {
      const oldHandle = fileHandles.get(oldPath);
      if (!oldHandle) return;

      const file = await oldHandle.getFile();
      const content = await file.text();

      // Resolve parents
      const oldParts = oldPath.split('/');
      const oldName = oldParts.pop();
      const oldParentPath = oldParts.join('/');

      const newParts = newPath.split('/');
      const newName = newParts.pop();
      const newParentPath = newParts.join('/');

      const parentNew = await getDirHandleForPath(dirHandle, newParentPath);
      const newHandle = await parentNew.getFileHandle(newName, { create: true });
      
      const writable = await newHandle.createWritable();
      await writable.write(content);
      await writable.close();

      const parentOld = await getDirHandleForPath(dirHandle, oldParentPath);
      await parentOld.removeEntry(oldName);

      fileHandles.delete(oldPath);
      fileHandles.set(newPath, newHandle);

      await refreshTree();
    } catch (err) {
      console.error(`Error renaming entry from "${oldPath}" to "${newPath}":`, err);
    }
  }, [dirHandle, isUnsupported, fileHandles, refreshTree]);

  return {
    dirHandle,
    fileTree,
    needsReconnect,
    isUnsupported,
    openFolder,
    reconnectFolder,
    readFileContent,
    saveFileContent,
    createFile,
    createFolder,
    deleteEntry,
    renameEntry,
    refreshTree
  };
}
