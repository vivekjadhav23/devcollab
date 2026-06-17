import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import FileIcon from '../ui/FileIcon';
import { X } from 'lucide-react';

export default function TabBar() {
  const workspace = useWorkspace();
  const { openFiles, activeFileId, switchFile, closeFile, reorderTabs } = workspace;
  
  const [draggedIndex, setDraggedIndex] = useState(null);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Required for Firefox
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      reorderTabs(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
  };

  if (openFiles.length === 0) {
    return (
      <div className="tab-bar empty-tab-bar">
        <span className="no-tabs-label">No files open</span>
      </div>
    );
  }

  return (
    <div className="tab-bar">
      <div className="tabs-container">
        {openFiles.map((file, index) => {
          const isActive = file.id === activeFileId;
          return (
            <div
              key={file.id}
              className={`workspace-tab ${isActive ? 'active' : ''} ${file.isDirty ? 'dirty' : ''}`}
              onClick={() => switchFile(file.id)}
              draggable="true"
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onAuxClick={(e) => {
                // Middle click closes tab
                if (e.button === 1) {
                  e.preventDefault();
                  closeFile(file.id);
                }
              }}
              title={file.path}
            >
              <FileIcon filename={file.name} size={14} />
              <span className="tab-name">{file.name}</span>
              
              {file.isDirty ? (
                <span className="tab-dirty-indicator" title="Unsaved changes"></span>
              ) : null}

              <button
                className="tab-close-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  closeFile(file.id);
                }}
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
