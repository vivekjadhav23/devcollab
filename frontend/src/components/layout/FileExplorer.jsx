import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import FileIcon from '../ui/FileIcon';
import ContextMenu from '../ui/ContextMenu';
import { Folder, FolderOpen, ChevronRight, ChevronDown, Plus, FolderPlus, Edit, Trash, AlertTriangle, RefreshCw } from 'lucide-react';

function FileNode({ node, onContextMenu }) {
  const workspace = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const isOpenTab = workspace.openFiles.some((f) => f.id === node.path);
  const isActiveTab = workspace.activeFileId === node.path;

  const handleClick = (e) => {
    e.stopPropagation();
    if (node.type === 'directory') {
      setIsOpen(!isOpen);
    } else {
      workspace.openFile(node.path);
    }
  };

  const handleRightClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e, node);
  };

  // Indent folder contents recursively
  const depth = node.path.split('/').length;
  const paddingLeft = `${depth * 12}px`;

  return (
    <div className="file-node-wrapper">
      <div 
        className={`file-node ${isActiveTab ? 'active' : ''} ${isOpenTab ? 'open' : ''}`}
        onClick={handleClick}
        onContextMenu={handleRightClick}
        style={{ paddingLeft }}
      >
        <div className="node-icon-label-group">
          {node.type === 'directory' ? (
            <>
              {isOpen ? <ChevronDown size={14} className="chevron" /> : <ChevronRight size={14} className="chevron" />}
              {isOpen ? <FolderOpen size={16} className="folder-icon open" /> : <Folder size={16} className="folder-icon" />}
            </>
          ) : (
            <FileIcon filename={node.name} size={14} />
          )}
          <span className="node-name">{node.name}</span>
        </div>
      </div>

      {node.type === 'directory' && isOpen && node.children && (
        <div className="folder-children">
          {node.children.map((child) => (
            <FileNode key={child.path} node={child} onContextMenu={onContextMenu} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileExplorer() {
  const workspace = useWorkspace();
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, node: null });

  const handleContextMenu = (e, node) => {
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      node
    });
  };

  const handleEmptyContextMenu = (e) => {
    e.preventDefault();
    // Don't show context menu if folder is not loaded
    if (!workspace.dirHandle && !workspace.isUnsupported) return;
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      node: null
    });
  };

  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, node: null });
  };

  const handleCreateFile = async () => {
    const name = prompt('Enter new file name:');
    if (!name) return;
    const parentPath = contextMenu.node && contextMenu.node.type === 'directory' ? contextMenu.node.path : '';
    const newPath = await workspace.createFile(name, parentPath);
    if (newPath) {
      workspace.openFile(newPath);
    }
  };

  const handleCreateFolder = async () => {
    const name = prompt('Enter new folder name:');
    if (!name) return;
    const parentPath = contextMenu.node && contextMenu.node.type === 'directory' ? contextMenu.node.path : '';
    await workspace.createFolder(name, parentPath);
  };

  const handleRename = async () => {
    const { node } = contextMenu;
    if (!node) return;
    const newName = prompt('Rename entry to:', node.name);
    if (!newName || newName === node.name) return;

    const parts = node.path.split('/');
    parts.pop();
    parts.push(newName);
    const newPath = parts.join('/');
    await workspace.renameEntry(node.path, newPath);
  };

  const handleDelete = async () => {
    const { node } = contextMenu;
    if (!node) return;
    const confirm = window.confirm(`Are you sure you want to delete ${node.name}?`);
    if (confirm) {
      await workspace.deleteEntry(node.path);
    }
  };

  const contextMenuItems = [
    {
      label: 'New File',
      icon: <Plus size={14} />,
      onClick: handleCreateFile
    },
    {
      label: 'New Folder',
      icon: <FolderPlus size={14} />,
      onClick: handleCreateFolder
    },
    ...(contextMenu.node ? [
      { divider: true },
      {
        label: 'Rename',
        icon: <Edit size={14} />,
        onClick: handleRename
      },
      {
        label: 'Delete',
        icon: <Trash size={14} />,
        danger: true,
        onClick: handleDelete
      }
    ] : [])
  ];

  return (
    <div className="file-explorer" onContextMenu={handleEmptyContextMenu}>
      <div className="explorer-header">
        <h2>WORKSPACE EXPLORER</h2>
      </div>

      {workspace.isUnsupported && (
        <div className="browser-warning-banner">
          <AlertTriangle size={14} />
          <span>Local filesystem direct disk saves are unsupported in Firefox. Use Chrome or Edge for full experience.</span>
        </div>
      )}

      {/* Explorer Body States */}
      {!workspace.dirHandle && workspace.fileTree.length === 0 && !workspace.isUnsupported ? (
        <div className="explorer-welcome-state">
          <p>No project folder opened in this workspace session.</p>
          <button onClick={workspace.openFolder} className="btn btn-primary open-folder-btn">
            <FolderOpen size={16} />
            <span>Open Folder</span>
          </button>
        </div>
      ) : workspace.needsReconnect ? (
        <div className="explorer-welcome-state reconnect">
          <AlertTriangle size={24} className="reconnect-alert-icon" />
          <p>Workspace connection requires security permission verification.</p>
          <button onClick={workspace.reconnectFolder} className="btn btn-primary reconnect-folder-btn">
            <RefreshCw size={16} />
            <span>Verify Permissions</span>
          </button>
        </div>
      ) : (
        <div className="explorer-tree-view">
          {workspace.fileTree.length === 0 ? (
            <div className="explorer-empty-tree">
              <span className="empty-label">Folder is empty</span>
            </div>
          ) : (
            workspace.fileTree.map((node) => (
              <FileNode key={node.path} node={node} onContextMenu={handleContextMenu} />
            ))
          )}
        </div>
      )}

      {/* Context dropdown portal */}
      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        visible={contextMenu.visible}
        onClose={closeContextMenu}
        items={contextMenuItems}
      />
    </div>
  );
}
