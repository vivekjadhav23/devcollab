import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Code, Users, Play, History, FolderOpen, Save, Copy, Check, LogOut, Layout, Terminal } from 'lucide-react';

export default function TopBar({ session, roomUsers, onRun, runLoading, onOpenHistory, onToggleSidebar, onToggleBottomPanel }) {
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();
  const workspace = useWorkspace();
  
  const [activeMenu, setActiveMenu] = useState(null);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyCode = async () => {
    if (!session?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(session.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const handleMenuClick = (menu) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="top-bar glass-card" ref={menuRef}>
      <div className="top-bar-left">
        <div className="brand-logo" onClick={() => navigate('/dashboard')} title="Back to Dashboard">
          <Code size={18} className="logo-icon animate-pulse" />
          <span>DevCollab</span>
        </div>

        <div className="menu-items">
          {/* File Menu */}
          <div className={`menu-wrapper ${activeMenu === 'file' ? 'open' : ''}`}>
            <button className="menu-trigger" onClick={() => handleMenuClick('file')}>
              File
            </button>
            <div className="dropdown-menu">
              <button onClick={() => { workspace.openFolder(); setActiveMenu(null); }}>
                <FolderOpen size={14} />
                <span>Open Folder...</span>
              </button>
              <button 
                onClick={() => { if (workspace.activeFileId) workspace.saveFile(workspace.activeFileId); setActiveMenu(null); }}
                disabled={!workspace.activeFileId}
              >
                <Save size={14} />
                <span>Save File (Ctrl+S)</span>
              </button>
              <button onClick={() => { workspace.saveAllFiles(); setActiveMenu(null); }}>
                <Save size={14} />
                <span>Save All Files</span>
              </button>
            </div>
          </div>

          {/* View Menu */}
          <div className={`menu-wrapper ${activeMenu === 'view' ? 'open' : ''}`}>
            <button className="menu-trigger" onClick={() => handleMenuClick('view')}>
              View
            </button>
            <div className="dropdown-menu">
              <button onClick={() => { onToggleSidebar(); setActiveMenu(null); }}>
                <Layout size={14} />
                <span>Toggle Explorer Sidebar</span>
              </button>
              <button onClick={() => { onToggleBottomPanel(); setActiveMenu(null); }}>
                <Terminal size={14} />
                <span>Toggle Output Panel</span>
              </button>
            </div>
          </div>

          {/* Share Menu */}
          <div className={`menu-wrapper ${activeMenu === 'share' ? 'open' : ''}`}>
            <button className="menu-trigger" onClick={() => handleMenuClick('share')}>
              Share
            </button>
            <div className="dropdown-menu">
              <button onClick={() => { handleCopyCode(); setActiveMenu(null); }}>
                <Copy size={14} />
                <span>Copy Invite Code</span>
              </button>
            </div>
          </div>
        </div>

        {session && (
          <span className="workspace-title-indicator">
            / {session.title}
          </span>
        )}
      </div>

      <div className="top-bar-center">
        {onRun && workspace.activeFileId && (
          <button 
            className="btn btn-primary run-btn flex-row gap-4 align-center" 
            onClick={onRun}
            disabled={runLoading}
            style={{ 
              backgroundColor: 'hsl(var(--success))', 
              borderColor: 'hsl(var(--success))',
              color: '#0d1117',
              padding: '6px 12px',
              fontSize: '12px',
              height: 'auto',
              borderRadius: '4px',
              fontWeight: '600'
            }}
          >
            <Play size={12} fill="#0d1117" />
            <span>{runLoading ? 'Running...' : 'Run Code'}</span>
          </button>
        )}

        {onOpenHistory && workspace.activeFileId && (
          <button 
            className="btn btn-outline flex-row gap-4 align-center" 
            onClick={onOpenHistory}
            style={{ 
              padding: '6px 12px',
              fontSize: '12px',
              height: 'auto',
              borderRadius: '4px',
              fontWeight: '600',
              marginLeft: '8px'
            }}
          >
            <History size={12} />
            <span>History</span>
          </button>
        )}
      </div>

      <div className="top-bar-right">
        {session && (
          <button 
            className={`invite-badge ${copied ? 'copied' : ''}`} 
            onClick={handleCopyCode} 
            title="Click to copy invite code"
          >
            <span className="invite-label">Invite Code:</span>
            <span className="invite-value">{session.inviteCode}</span>
            {copied ? <Check size={12} className="badge-status-icon" /> : <Copy size={12} className="badge-status-icon" />}
          </button>
        )}

        <div className="avatar-status-badge">
          <div className="active-users-count" title="Connected Users">
            <Users size={12} />
            <span>{roomUsers.length}</span>
          </div>
          <div className="avatar-cluster">
            {roomUsers.map((u, idx) => (
              <img
                key={idx}
                src={u.avatarUrl}
                alt={u.username}
                className="user-avatar-stack"
                title={`${u.username} (Connected)`}
                style={{ zIndex: 10 - idx }}
              />
            ))}
          </div>
        </div>

        {/* Profile menu */}
        <div className={`menu-wrapper ${activeMenu === 'profile' ? 'open' : ''}`}>
          <img 
            src={authUser?.avatarUrl || 'https://avatars.githubusercontent.com/u/9919?v=4'} 
            alt="Profile" 
            className="user-avatar-profile"
            onClick={() => handleMenuClick('profile')}
            style={{ cursor: 'pointer', borderRadius: '50%', width: '28px', height: '28px', border: '1px solid hsl(var(--border-color))' }}
          />
          <div className="dropdown-menu dropdown-right">
            <div className="dropdown-user-info">
              <strong>{authUser?.username}</strong>
              <small>{authUser?.email}</small>
            </div>
            <div className="dropdown-divider"></div>
            <button onClick={() => { navigate('/dashboard'); setActiveMenu(null); }}>
              <span>Dashboard</span>
            </button>
            <button onClick={handleLogout} className="logout-btn">
              <LogOut size={14} />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
