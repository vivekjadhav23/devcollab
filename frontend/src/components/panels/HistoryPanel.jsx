import React, { useState, useEffect } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { RotateCcw, Clock, User, Cpu, Loader2, FileCode } from 'lucide-react';
import api from '../../utils/api';

export default function HistoryPanel({ isOpen, sessionId, fileId, currentCode, onRestore }) {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState('');

  // Fetch snapshots for the active file
  useEffect(() => {
    if (!isOpen || !sessionId || !fileId) return;

    const fetchSnapshots = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get(`/sessions/${sessionId}/snapshots`, {
          params: { fileId }
        });
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
  }, [isOpen, sessionId, fileId]);

  if (!isOpen) return null;

  const handleRestore = async (snapshot) => {
    if (!window.confirm(`Are you sure you want to restore "${fileId}" to this version? This will overwrite your current code.`)) {
      return;
    }

    setRestoring(true);
    try {
      await api.post(`/snapshots/${snapshot._id}/restore`);
      onRestore(snapshot.code);
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
      minute: '2-digit'
    });
  };

  return (
    <div className="history-panel-content flex-row" style={{ height: '220px', overflow: 'hidden' }}>
      {/* Left Column: List */}
      <div className="history-sidebar-list flex-column" style={{ width: '220px', borderRight: '1px solid hsl(var(--border))', padding: '10px', overflowY: 'auto', maxHeight: '100%' }}>
        <div className="snapshots-scroll-container">
          {loading ? (
            <div className="panel-status-loader flex-column align-center justify-center" style={{ padding: '20px 0' }}>
              <Loader2 className="animate-spin" size={16} style={{ color: 'hsl(var(--primary))', marginBottom: '4px' }} />
              <span style={{ fontSize: '11px', color: 'hsl(var(--text-muted))' }}>Loading history...</span>
            </div>
          ) : error ? (
            <div className="panel-error-state" style={{ fontSize: '11px', color: 'hsl(var(--error))' }}>{error}</div>
          ) : snapshots.length === 0 ? (
            <div className="panel-empty-state text-center" style={{ padding: '20px 0', color: 'hsl(var(--text-muted))' }}>
              <Clock size={18} style={{ opacity: 0.3, marginBottom: '4px' }} />
              <p style={{ fontSize: '11px', margin: 0 }}>No snapshots recorded yet.</p>
            </div>
          ) : (
            <div className="snapshot-cards-stack flex-column gap-6">
              {snapshots.map((snap) => {
                const isSelected = selectedSnapshot?._id === snap._id;
                return (
                  <div
                    key={snap._id}
                    className={`snapshot-card flex-column gap-4 ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedSnapshot(snap)}
                    style={{
                      padding: '6px 8px',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      backgroundColor: isSelected ? 'hsl(var(--bg-card-hover))' : 'transparent'
                    }}
                  >
                    <div className="snap-time-row flex-row space-between align-center">
                      <span className="snap-timestamp" style={{ fontWeight: '500' }}>{formatDate(snap.createdAt)}</span>
                      {snap.savedBy ? (
                        <span className="snap-badge user-saved flex-row gap-2 align-center" style={{ fontSize: '9px', padding: '1px 4px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                          <User size={8} />
                          <span>User</span>
                        </span>
                      ) : (
                        <span className="snap-badge auto-saved flex-row gap-2 align-center" style={{ fontSize: '9px', padding: '1px 4px', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'hsl(var(--primary))' }}>
                          <Cpu size={8} />
                          <span>Auto</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Diff View */}
      <div className="history-diff-preview flex-column flex-1" style={{ height: '100%', overflow: 'hidden' }}>
        {selectedSnapshot ? (
          <div className="flex-column" style={{ height: '100%' }}>
            <div className="diff-header-bar flex-row space-between align-center" style={{ padding: '8px 16px', borderBottom: '1px solid hsl(var(--border))', backgroundColor: 'rgba(255,255,255,0.01)' }}>
              <div className="flex-row gap-8 align-center" style={{ fontSize: '11px', color: 'hsl(var(--text-muted))' }}>
                <FileCode size={13} style={{ color: 'hsl(var(--primary))' }} />
                <span>Comparing version from <strong>{formatDate(selectedSnapshot.createdAt)}</strong></span>
              </div>
              <button
                className="btn btn-primary restore-action-btn flex-row gap-4 align-center"
                onClick={() => handleRestore(selectedSnapshot)}
                disabled={restoring}
                style={{
                  backgroundColor: 'hsl(var(--success))',
                  borderColor: 'hsl(var(--success))',
                  color: '#0d1117',
                  fontWeight: '600',
                  padding: '4px 10px',
                  height: 'auto',
                  fontSize: '11px',
                  borderRadius: '4px'
                }}
              >
                {restoring ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
                <span>Restore</span>
              </button>
            </div>

            <div className="diff-editor-wrapper" style={{ height: '170px' }}>
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
                  fontSize: 11.5,
                  fontFamily: "'Fira Code', Consolas, monospace",
                  automaticLayout: true,
                  scrollbar: {
                    verticalScrollbarSize: 4,
                    horizontalScrollbarSize: 4
                  }
                }}
              />
            </div>
          </div>
        ) : (
          <div className="diff-empty-placeholder flex-column align-center justify-center flex-1" style={{ color: 'hsl(var(--text-muted))', fontSize: '11.5px', padding: '24px' }}>
            <Clock size={24} style={{ opacity: 0.15, marginBottom: '8px' }} />
            <p style={{ margin: 0 }}>Select a version from the left list to view diff comparisons.</p>
          </div>
        )}
      </div>
    </div>
  );
}
