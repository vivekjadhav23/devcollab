import React from 'react';

export default function FileIcon({ filename, size = 14 }) {
  if (!filename) return <span style={{ fontSize: `${size}px` }}>📄</span>;
  const ext = filename.split('.').pop().toLowerCase();
  
  switch (ext) {
    case 'js':
    case 'jsx':
      return <span style={{ fontSize: `${size}px`, marginRight: '6px' }}>🟨</span>;
    case 'ts':
    case 'tsx':
      return <span style={{ fontSize: `${size}px`, marginRight: '6px' }}>🟦</span>;
    case 'py':
      return <span style={{ fontSize: `${size}px`, marginRight: '6px' }}>🐍</span>;
    case 'cpp':
    case 'cc':
    case 'h':
    case 'hpp':
      return <span style={{ fontSize: `${size}px`, marginRight: '6px' }}>🟣</span>;
    case 'java':
      return <span style={{ fontSize: `${size}px`, marginRight: '6px' }}>☕</span>;
    case 'json':
      return <span style={{ fontSize: `${size}px`, marginRight: '6px' }}>🟧</span>;
    case 'md':
      return <span style={{ fontSize: `${size}px`, marginRight: '6px' }}>📄</span>;
    case 'css':
      return <span style={{ fontSize: `${size}px`, marginRight: '6px' }}>🎨</span>;
    case 'html':
    case 'htm':
      return <span style={{ fontSize: `${size}px`, marginRight: '6px' }}>🌐</span>;
    default:
      return <span style={{ fontSize: `${size}px`, marginRight: '6px' }}>📄</span>;
  }
}
