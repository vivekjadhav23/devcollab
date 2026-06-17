import React from 'react';
import { Terminal, Trash2, X, Loader2 } from 'lucide-react';

export default function OutputPanel({ result, onClear, onClose }) {
  const { stdout = '', stderr = '', time = '', memory = '', loading = false, status = null } = result;

  const getStatusClass = (desc) => {
    if (!desc) return '';
    if (desc === 'Accepted' || desc === 'Finished') return 'status-accepted';
    if (desc.includes('Time Limit') || desc.includes('Error')) return 'status-failed';
    return 'status-pending';
  };

  return (
    <div className="output-panel-console-content flex-column" style={{ height: '100%' }}>
      {/* Console Header Bar */}
      <div className="console-header flex-row space-between align-center" style={{ padding: '8px 16px', borderBottom: '1px solid hsl(var(--border))' }}>
        <div className="flex-row gap-8 align-center">
          <Terminal size={14} style={{ color: 'hsl(var(--primary))' }} />
          <span className="console-title" style={{ fontSize: '13px', fontWeight: '600' }}>Terminal Console</span>
          {status && (
            <span className={`status-badge ${getStatusClass(status.description)}`}>
              {status.description}
            </span>
          )}
        </div>

        <div className="flex-row gap-12 align-center">
          {/* Performance Meta Tags */}
          {(time || memory) && !loading && (
            <div className="console-meta-stats flex-row gap-8">
              {time && <span className="stat-tag" style={{ fontSize: '11px' }}>Time: <strong>{time}</strong></span>}
              {memory && memory !== 'N/A' && <span className="stat-tag" style={{ fontSize: '11px' }}>Memory: <strong>{memory}</strong></span>}
            </div>
          )}

          {/* Action buttons */}
          <button 
            className="btn btn-outline btn-xs flex-row gap-4" 
            onClick={onClear} 
            title="Clear Console"
            style={{ padding: '3px 8px', fontSize: '10px', height: 'auto' }}
          >
            <Trash2 size={11} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Output Stream Content */}
      <div className="console-body" style={{ flex: 1, padding: '12px 16px', overflowY: 'auto', maxHeight: '180px', fontFamily: "'Fira Code', monospace", fontSize: '12.5px' }}>
        {loading ? (
          <div className="console-status-message flex-row gap-8 align-center" style={{ color: 'hsl(var(--text-muted))' }}>
            <Loader2 size={14} className="animate-spin" />
            <span>Executing code inside the workspace sandbox...</span>
          </div>
        ) : !stdout && !stderr ? (
          <div className="console-status-message empty-console" style={{ color: 'hsl(var(--text-muted))', fontSize: '12px', padding: '12px 0' }}>
            <span>Console output is empty. Click the <strong>Run Code</strong> button to compile and execute.</span>
          </div>
        ) : (
          <pre className="output-stream" style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {stdout && <span className="stdout-text" style={{ color: '#4ade80' }}>{stdout}</span>}
            {stderr && <span className="stderr-text" style={{ color: '#f87171' }}>{stderr}</span>}
          </pre>
        )}
      </div>
    </div>
  );
}
