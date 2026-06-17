import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

export default function ContextMenu({ x, y, visible, onClose, items }) {
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [visible, onClose]);

  if (!visible) return null;

  // Enforce boundary constraints so menu doesn't overflow screen viewport
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;
  const clickX = x;
  const clickY = y;
  
  // Estimate dimensions
  const menuWidth = 160;
  const menuHeight = 150;

  const left = (clickX + menuWidth > screenW) ? clickX - menuWidth : clickX;
  const top = (clickY + menuHeight > screenH) ? clickY - menuHeight : clickY;

  const style = {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    zIndex: 99999
  };

  return ReactDOM.createPortal(
    <div ref={menuRef} style={style} className="context-menu glass-card">
      {items.map((item, index) => {
        if (item.divider) {
          return <div key={index} className="context-menu-divider" />;
        }
        return (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              item.onClick();
              onClose();
            }}
            className={`context-menu-option ${item.danger ? 'danger' : ''}`}
          >
            {item.icon && <span className="option-icon">{item.icon}</span>}
            <span className="option-label">{item.label}</span>
          </button>
        );
      })}
    </div>,
    document.body
  );
}
