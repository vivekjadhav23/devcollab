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
    <div className="output-panel-console glass-card">
      {/* Console Header Bar */}
      <div className="console-header flex-row space-between align-center">
        <div className="flex-row gap-8 align-center">
          <Terminal size={14} className="accent-blue" style={{ color: 'hsl(var(--primary))' }} />
          <span className="console-title">Terminal Console</span>
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
              {time && <span className="stat-tag">Time: <strong>{time}</strong></span>}
              {memory && memory !== 'N/A' && <span className="stat-tag">Memory: <strong>{memory}</strong></span>}
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
          <button 
            className="btn btn-outline btn-xs flex-row" 
            onClick={onClose} 
            title="Close Panel"
            style={{ padding: '3px', height: 'auto' }}
          >
            <X size={11} />
          </button>
        </div>
      </div>

      {/* Output Stream Content */}
      <div className="console-body">
        {loading ? (
          <div className="console-status-message flex-row gap-8 align-center">
            <Loader2 size={14} className="animate-spin" style={{ color: 'hsl(var(--primary))' }} />
            <span>Executing code inside the workspace sandbox...</span>
          </div>
        ) : !stdout && !stderr ? (
          <div className="console-status-message empty-console">
            <span>Console output is empty. Click the <strong>Run Code</strong> button to compile and execute.</span>
          </div>
        ) : (
          <pre className="output-stream">
            {stdout && <span className="stdout-text">{stdout}</span>}
            {stderr && <span className="stderr-text">{stderr}</span>}
          </pre>
        )}
      </div>
    </div>
  );
}
