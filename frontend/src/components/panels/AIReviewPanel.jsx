import React from 'react';
import { ShieldAlert, Lightbulb, Sparkles, Clock, AlertTriangle, Loader2 } from 'lucide-react';

export default function AIReviewPanel({ review, onTriggerReview }) {
  const { bugs = [], suggestions = [], complexity = '', loading = false, error = '' } = review;

  return (
    <div className="ai-review-panel-content">
      <div className="sidebar-header flex-row space-between" style={{ padding: '12px 16px', borderBottom: '1px solid hsl(var(--border))' }}>
        <div className="flex-row gap-8">
          <Sparkles size={18} style={{ color: 'hsl(var(--primary))' }} />
          <h2 className="sidebar-title" style={{ fontSize: '14px', fontWeight: '600' }}>AI Code Auditor</h2>
        </div>
        <button 
          className="btn btn-outline btn-xs flex-row gap-4" 
          disabled={loading} 
          onClick={onTriggerReview}
          style={{ padding: '4px 8px', fontSize: '11px', height: 'auto' }}
        >
          {loading ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Sparkles size={12} />
              <span>Audit Code</span>
            </>
          )}
        </button>
      </div>

      <div className="panel-scrollable-content" style={{ padding: '16px', overflowY: 'auto', maxHeight: '180px' }}>
        {loading ? (
          <div className="sidebar-loader flex-column align-center justify-center" style={{ padding: '24px 0' }}>
            <Loader2 size={24} className="animate-spin" style={{ color: 'hsl(var(--primary))', marginBottom: '8px' }} />
            <p style={{ fontSize: '12px', color: 'hsl(var(--text-muted))' }}>Gemini is reviewing your workspace...</p>
          </div>
        ) : error ? (
          <div className="sidebar-error error-alert flex-row gap-8 align-center" style={{ fontSize: '12px', color: 'hsl(var(--error))' }}>
            <AlertTriangle size={14} />
            <span>{error}</span>
          </div>
        ) : !complexity && bugs.length === 0 && suggestions.length === 0 ? (
          <div className="sidebar-empty-state text-center" style={{ padding: '24px 0', color: 'hsl(var(--text-muted))' }}>
            <Sparkles size={24} style={{ opacity: 0.15, marginBottom: '8px' }} />
            <p style={{ fontSize: '12px' }}>Press <kbd className="kbd">Ctrl + S</kbd> or click <strong>Audit Code</strong> to trigger a real-time Gemini AI review of the active file.</p>
          </div>
        ) : (
          <div className="review-results-container flex-row gap-16 align-start">
            {/* Complexity Block */}
            {complexity && (
              <div className="complexity-badge-card flex-row gap-8 align-center" style={{ border: '1px solid hsl(var(--border))', padding: '10px', borderRadius: '6px', minWidth: '150px' }}>
                <Clock size={15} style={{ color: 'hsl(var(--primary))' }} />
                <div>
                  <div style={{ fontSize: '11px', color: 'hsl(var(--text-muted))' }}>Complexity:</div>
                  <strong style={{ fontSize: '13px' }}>{complexity}</strong>
                </div>
              </div>
            )}

            {/* Bugs Block */}
            <div className="review-section flex-1">
              <div className="section-title-bar flex-row gap-8 align-center" style={{ marginBottom: '8px' }}>
                <ShieldAlert size={15} style={{ color: 'hsl(var(--error))' }} />
                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '600' }}>Potential Bugs ({bugs.length})</h3>
              </div>
              {bugs.length === 0 ? (
                <p style={{ fontSize: '12px', color: '#10b981' }}>🎉 No critical bugs detected.</p>
              ) : (
                <ul className="issues-list" style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
                  {bugs.map((bug, index) => (
                    <li key={index} style={{ fontSize: '12px', marginBottom: '4px' }}>
                      • {bug}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Suggestions Block */}
            <div className="review-section flex-1">
              <div className="section-title-bar flex-row gap-8 align-center" style={{ marginBottom: '8px' }}>
                <Lightbulb size={15} style={{ color: 'hsl(var(--secondary))' }} />
                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '600' }}>Refactoring Suggestions ({suggestions.length})</h3>
              </div>
              {suggestions.length === 0 ? (
                <p style={{ fontSize: '12px', color: '#10b981' }}>🎉 No improvements suggested.</p>
              ) : (
                <ul className="issues-list" style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
                  {suggestions.map((suggestion, index) => (
                    <li key={index} style={{ fontSize: '12px', marginBottom: '4px' }}>
                      • {suggestion}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
