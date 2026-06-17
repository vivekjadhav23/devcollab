import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check, Users, Code, Play, History } from 'lucide-react';

export default function SessionHeader({ session, roomUsers, onLanguageChange, onRun, runLoading, onOpenHistory }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    if (!session?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(session.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <header className="session-header-widget glass-card">
      <div className="header-left">
        <button className="btn btn-outline back-btn" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={16} />
          <span>Dashboard</span>
        </button>
        <div className="header-title-box">
          <Code size={20} className="accent-blue" />
          <h1 className="header-room-title">{session?.title || 'Loading Workspace...'}</h1>
        </div>
      </div>

      <div className="header-center flex-row gap-12 align-center">
        {session && (
          <div className="lang-widget">
            <span className="lang-widget-label">Language:</span>
            <select
              className="form-input lang-widget-select"
              value={session.language}
              onChange={(e) => onLanguageChange(e.target.value)}
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
            </select>
          </div>
        )}

        {onRun && (
          <button 
            className="btn btn-primary run-btn flex-row gap-4 align-center" 
            onClick={onRun}
            disabled={runLoading}
            style={{ 
              backgroundColor: 'hsl(var(--success))', 
              borderColor: 'hsl(var(--success))',
              color: '#0d1117',
              padding: '6px 12px',
              fontSize: '13px',
              height: 'auto',
              borderRadius: '6px',
              fontWeight: '600'
            }}
          >
            <Play size={13} fill="#0d1117" />
            <span>{runLoading ? 'Running...' : 'Run Code'}</span>
          </button>
        )}

        {onOpenHistory && (
          <button 
            className="btn btn-outline flex-row gap-4 align-center" 
            onClick={onOpenHistory}
            style={{ 
              padding: '6px 12px',
              fontSize: '13px',
              height: 'auto',
              borderRadius: '6px',
              fontWeight: '600',
              marginLeft: '8px'
            }}
          >
            <History size={13} />
            <span>History</span>
          </button>
        )}
      </div>

      <div className="header-right">
        {session && (
          <button 
            className={`invite-badge ${copied ? 'copied' : ''}`} 
            onClick={handleCopyCode} 
            title="Click to copy invite code"
          >
            <span className="invite-label">Invite Code:</span>
            <span className="invite-value">{session.inviteCode}</span>
            {copied ? <Check size={14} className="badge-status-icon" /> : <Copy size={14} className="badge-status-icon" />}
          </button>
        )}

        <div className="avatar-status-badge">
          <div className="active-users-count" title="Active users">
            <Users size={14} />
            <span>{roomUsers.length}</span>
          </div>
          <div className="avatar-cluster">
            {roomUsers.map((user, index) => (
              <img
                key={index}
                src={user.avatarUrl}
                alt={user.username}
                className="user-avatar-stack"
                title={`${user.username} (Connected)`}
                style={{ zIndex: 10 - index }}
              />
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
