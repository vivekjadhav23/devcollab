import React from 'react';
import { ShieldAlert, Lightbulb, Sparkles, Clock, AlertTriangle, Loader2 } from 'lucide-react';

export default function AIReviewPanel({ review, onTriggerReview }) {
  const { bugs = [], suggestions = [], complexity = '', loading = false, error = '' } = review;

  return (
    <div className="ai-review-sidebar glass-card">
      <div className="sidebar-header card-header flex-row space-between" style={{ padding: '12px 16px', borderBottom: '1px solid hsl(var(--border))' }}>
        <div className="flex-row gap-8">
          <Sparkles size={18} className="accent-cyan animate-pulse" style={{ color: 'hsl(var(--primary))' }} />
          <h2 className="sidebar-title" style={{ fontSize: '15px', fontWeight: '600' }}>AI Code Review</h2>
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
              <span>Review Code</span>
            </>
          )}
        </button>
      </div>

      <div className="sidebar-scrollable-content">
        {loading ? (
          <div className="sidebar-loader">
            <Loader2 size={32} className="loading-logo-icon animate-spin accent-cyan" style={{ color: 'hsl(var(--primary))' }} />
            <p>Gemini is reviewing your workspace...</p>
          </div>
        ) : error ? (
          <div className="sidebar-error error-alert" style={{ fontSize: '12px' }}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        ) : !complexity && bugs.length === 0 && suggestions.length === 0 ? (
          <div className="sidebar-empty-state">
            <Sparkles size={32} className="empty-icon" style={{ opacity: 0.15, marginBottom: '8px' }} />
            <h3>No Review Yet</h3>
            <p>Press <kbd className="kbd">Ctrl + S</kbd> or click <strong>Review Code</strong> to trigger a real-time Gemini AI review of this workspace.</p>
          </div>
        ) : (
          <div className="review-results-container">
            {/* Complexity Block */}
            {complexity && (
              <div className="complexity-badge-card flex-row gap-8 align-center">
                <Clock size={15} className="accent-blue" style={{ color: 'hsl(var(--primary))' }} />
                <div>
                  <span className="badge-meta-label">Est. Complexity:</span>
                  <strong className="badge-meta-value">{complexity}</strong>
                </div>
              </div>
            )}

            {/* Bugs Block */}
            <div className="review-section">
              <div className="section-title-bar flex-row gap-8 align-center">
                <ShieldAlert size={16} className="accent-red" style={{ color: 'hsl(var(--error))' }} />
                <h3 style={{ margin: 0 }}>Potential Bugs ({bugs.length})</h3>
              </div>
              {bugs.length === 0 ? (
                <p className="no-issues-text">🎉 No critical bugs detected.</p>
              ) : (
                <ul className="issues-list">
                  {bugs.map((bug, index) => (
                    <li key={index} className="issue-item bug-item flex-row align-start gap-8">
                      <span className="bullet-dot bg-red"></span>
                      <span className="issue-text">{bug}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Suggestions Block */}
            <div className="review-section" style={{ marginTop: '8px' }}>
              <div className="section-title-bar flex-row gap-8 align-center">
                <Lightbulb size={16} className="accent-yellow" style={{ color: 'hsl(var(--warning))' }} />
                <h3 style={{ margin: 0 }}>Refactoring & Style ({suggestions.length})</h3>
              </div>
              {suggestions.length === 0 ? (
                <p className="no-issues-text">🎉 No improvements suggested.</p>
              ) : (
                <ul className="issues-list">
                  {suggestions.map((suggestion, index) => (
                    <li key={index} className="issue-item suggestion-item flex-row align-start gap-8">
                      <span className="bullet-dot bg-yellow"></span>
                      <span className="issue-text">{suggestion}</span>
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
