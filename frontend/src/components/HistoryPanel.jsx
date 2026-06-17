import React, { useState, useEffect } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { X, RotateCcw, Clock, User, Cpu, Loader2, FileCode } from 'lucide-react';
import api from '../utils/api';

export default function HistoryPanel({ isOpen, onClose, sessionId, currentCode, onRestore }) {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState('');

  // Fetch snapshots whenever panel is opened
  useEffect(() => {
    if (!isOpen || !sessionId) return;

    const fetchSnapshots = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get(`/sessions/${sessionId}/snapshots`);
        setSnapshots(response.data);
        if (response.data.length > 0) {
          setSelectedSnapshot(response.data[0]);
        } else {
          setSelectedSnapshot(null);
        }
      } catch (err) {
        console.error('Failed to fetch snapshots:', err);
        setError('Failed to load version history.');
      } finally {
        setLoading(false);
      }
    };

    fetchSnapshots();
  }, [isOpen, sessionId]);

  if (!isOpen) return null;

  const handleRestore = async (snapshot) => {
    if (!window.confirm('Are you sure you want to restore this version? This will overwrite the current live code.')) {
      return;
    }

    setRestoring(true);
    try {
      await api.post(`/snapshots/${snapshot._id}/restore`);
      onRestore(snapshot.code);
      onClose();
    } catch (err) {
      console.error('Failed to restore snapshot:', err);
      alert('Failed to restore selected version.');
    } finally {
      setRestoring(false);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="history-panel-overlay flex-row justify-end">
      {/* Backdrop click to close */}
      <div className="overlay-backdrop" onClick={onClose}></div>

      {/* Main Wide Drawer Container */}
      <div className="history-panel-drawer glass-card flex-row">
        
        {/* Left Side: Version List */}
        <div className="history-sidebar-list flex-column">
          <div className="panel-header-simple flex-row space-between align-center">
            <div className="flex-row gap-8 align-center">
              <Clock size={15} style={{ color: 'hsl(var(--primary))' }} />
              <h2>Version History</h2>
            </div>
            <button className="btn btn-outline btn-xs" onClick={onClose} style={{ padding: '3px', height: 'auto' }}>
              <X size={14} />
            </button>
          </div>

          <div className="snapshots-scroll-container flex-1">
            {loading ? (
              <div className="panel-status-loader flex-column align-center justify-center">
                <Loader2 className="animate-spin" style={{ color: 'hsl(var(--primary))' }} size={24} />
                <p>Loading history logs...</p>
              </div>
            ) : error ? (
              <div className="panel-error-state">{error}</div>
            ) : snapshots.length === 0 ? (
              <div className="panel-empty-state flex-column align-center justify-center text-center">
                <Clock size={28} style={{ opacity: 0.3 }} />
                <h3>No snapshots recorded yet</h3>
                <p>Automated snapshots occur every 5 minutes during active editing sessions.</p>
              </div>
            ) : (
              <div className="snapshot-cards-stack flex-column gap-8">
                {snapshots.map((snap) => {
                  const isSelected = selectedSnapshot?._id === snap._id;
                  return (
                    <div
                      key={snap._id}
                      className={`snapshot-card flex-column gap-6 ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedSnapshot(snap)}
                    >
                      <div className="snap-time-row flex-row space-between align-center">
                        <span className="snap-timestamp">{formatDate(snap.createdAt)}</span>
                        {snap.savedBy ? (
                          <span className="snap-badge user-saved flex-row gap-4 align-center" title={`Saved by user: ${snap.savedBy.username}`}>
                            <User size={10} />
                            <span>User</span>
                          </span>
                        ) : (
                          <span className="snap-badge auto-saved flex-row gap-4 align-center" title="Automatic backup snapshot">
                            <Cpu size={10} />
                            <span>Auto</span>
                          </span>
                        )}
                      </div>
                      {snap.savedBy && (
                        <div className="snap-user-row flex-row gap-6 align-center">
                          <img src={snap.savedBy.avatarUrl} alt={snap.savedBy.username} className="snap-user-avatar" />
                          <span className="snap-username">{snap.savedBy.username}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Diff Preview Panel */}
        <div className="history-diff-preview flex-column flex-1">
          {selectedSnapshot ? (
            <>
              {/* Header Info & Actions */}
              <div className="diff-header-bar flex-row space-between align-center">
                <div className="flex-column gap-4">
                  <div className="flex-row gap-8 align-center">
                    <FileCode size={14} style={{ color: 'hsl(var(--primary))' }} />
                    <span className="diff-title-label">Comparing version from:</span>
                    <strong style={{ fontSize: '13px', color: 'hsl(var(--text))' }}>{formatDate(selectedSnapshot.createdAt)}</strong>
                  </div>
                  <span className="diff-subtitle-label">
                    Left: Snapshot Version ({selectedSnapshot.language}) | Right: Live Editor Code
                  </span>
                </div>

                <button
                  className="btn btn-primary restore-action-btn flex-row gap-6 align-center"
                  onClick={() => handleRestore(selectedSnapshot)}
                  disabled={restoring}
                  style={{
                    backgroundColor: 'hsl(var(--success))',
                    borderColor: 'hsl(var(--success))',
                    color: '#0d1117',
                    fontWeight: '600',
                    padding: '8px 16px',
                    height: 'auto',
                    fontSize: '13px'
                  }}
                >
                  {restoring ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Restoring...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw size={14} />
                      <span>Restore This Version</span>
                    </>
                  )}
                </button>
              </div>

              {/* Monaco Diff Viewer */}
              <div className="diff-editor-wrapper flex-1">
                <DiffEditor
                  height="100%"
                  language={selectedSnapshot.language}
                  original={selectedSnapshot.code}
                  modified={currentCode}
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    originalEditable: false,
                    renderSideBySide: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: "'Fira Code', Consolas, monospace",
                    automaticLayout: true,
                    scrollbar: {
                      verticalScrollbarSize: 6,
                      horizontalScrollbarSize: 6
                    }
                  }}
                />
              </div>
            </>
          ) : (
            <div className="diff-empty-placeholder flex-column align-center justify-center flex-1">
              <Clock size={48} style={{ opacity: 0.15, marginBottom: '16px' }} />
              <p>Select a historical version from the list to compare changes side-by-side.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
