import React from 'react';
import OutputPanel from '../panels/OutputPanel';
import AIReviewPanel from '../panels/AIReviewPanel';
import HistoryPanel from '../panels/HistoryPanel';
import { Terminal, Sparkles, Clock, ChevronDown } from 'lucide-react';

export default function BottomPanel({
  activePanel,
  setActivePanel,
  executionResult,
  onClearOutput,
  aiReview,
  onTriggerAIReview,
  sessionId,
  currentCode,
  activeFileId,
  onRestoreSnapshot
}) {
  if (!activePanel) return null;

  return (
    <div className="bottom-panel-widget glass-card">
      <div className="bottom-panel-header flex-row space-between align-center">
        <div className="panel-tab-headers flex-row">
          <button 
            className={`panel-tab-btn ${activePanel === 'output' ? 'active' : ''}`}
            onClick={() => setActivePanel('output')}
          >
            <Terminal size={13} />
            <span>Output Console</span>
          </button>
          
          <button 
            className={`panel-tab-btn ${activePanel === 'ai-review' ? 'active' : ''}`}
            onClick={() => setActivePanel('ai-review')}
          >
            <Sparkles size={13} />
            <span>AI Reviews</span>
          </button>
          
          <button 
            className={`panel-tab-btn ${activePanel === 'history' ? 'active' : ''}`}
            onClick={() => setActivePanel('history')}
          >
            <Clock size={13} />
            <span>Version History</span>
          </button>
        </div>

        <button 
          className="panel-collapse-btn" 
          onClick={() => setActivePanel(null)}
          title="Minimize Panel"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      <div className="bottom-panel-body">
        {activePanel === 'output' && (
          <OutputPanel 
            result={executionResult} 
            onClear={onClearOutput} 
            onClose={() => setActivePanel(null)} 
          />
        )}
        
        {activePanel === 'ai-review' && (
          <AIReviewPanel 
            review={aiReview} 
            onTriggerReview={onTriggerAIReview} 
          />
        )}
        
        {activePanel === 'history' && (
          <HistoryPanel 
            isOpen={activePanel === 'history'}
            sessionId={sessionId}
            fileId={activeFileId}
            currentCode={currentCode}
            onRestore={onRestoreSnapshot}
          />
        )}
      </div>
    </div>
  );
}
