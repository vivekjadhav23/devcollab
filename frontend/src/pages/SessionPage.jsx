import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import useSocket from '../hooks/useSocket';
import useCollaboration from '../hooks/useCollaboration';
import { WorkspaceProvider, useWorkspace } from '../context/WorkspaceContext';

import TopBar from '../components/layout/TopBar';
import TabBar from '../components/layout/TabBar';
import FileExplorer from '../components/layout/FileExplorer';
import BottomPanel from '../components/layout/BottomPanel';

import Editor from '../components/Editor';
import UserCursors from '../components/UserCursors';
import { Loader2, AlertCircle, Sparkles } from 'lucide-react';

function SessionPageContent() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const workspace = useWorkspace();

  const [session, setSession] = useState(null);
  const [editor, setEditor] = useState(null);
  const [monaco, setMonaco] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Layout views toggles
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [bottomPanel, setBottomPanel] = useState(null); // 'output' | 'ai-review' | 'history' | null

  const [aiReview, setAiReview] = useState({
    bugs: [],
    suggestions: [],
    complexity: '',
    loading: false,
    error: ''
  });

  const [runResult, setRunResult] = useState({
    stdout: '',
    stderr: '',
    time: '',
    memory: '',
    loading: false,
    status: null
  });

  // Attach socket and session to WorkspaceContext
  useEffect(() => {
    workspace.setSocket(socket);
    workspace.setSessionId(sessionId);
  }, [socket, sessionId, workspace]);

  // Fetch session details on mount
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await api.get(`/sessions/${sessionId}`);
        setSession(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load session details:', err);
        setError(err.response?.data?.message || 'Failed to connect to room. Check ID or permission.');
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchSession();
    }
  }, [sessionId]);

  // Wire AI Review & Code Execution Socket events
  useEffect(() => {
    if (!socket) return;

    const onAIReview = (result) => {
      setAiReview({
        bugs: result.bugs || [],
        suggestions: result.suggestions || [],
        complexity: result.complexity || '',
        loading: false,
        error: ''
      });
      setBottomPanel('ai-review');
    };

    const onRunStatus = (status) => {
      setRunResult((prev) => ({
        ...prev,
        loading: true,
        status: { description: status.status || 'Running...' }
      }));
      setBottomPanel('output');
    };

    const onRunResult = (result) => {
      setRunResult({
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        time: result.time || '',
        memory: result.memory || '',
        loading: false,
        status: result.status || null
      });
      setBottomPanel('output');
    };

    socket.on('ai-review', onAIReview);
    socket.on('run-status', onRunStatus);
    socket.on('run-result', onRunResult);

    return () => {
      socket.off('ai-review', onAIReview);
      socket.off('run-status', onRunStatus);
      socket.off('run-result', onRunResult);
    };
  }, [socket]);

  // Save and trigger AI Review
  const handleTriggerReview = useCallback(() => {
    if (!socket || !sessionId || !workspace.activeFileId) return;
    setAiReview((prev) => ({ ...prev, loading: true, error: '' }));
    
    // Save locally first
    workspace.saveFile(workspace.activeFileId);
    
    socket.emit('save-code', { sessionId, fileId: workspace.activeFileId });
  }, [socket, sessionId, workspace]);

  // Execute active file code
  const handleRunCode = useCallback(() => {
    if (!socket || !sessionId || !workspace.activeFileId) return;
    setRunResult((prev) => ({
      ...prev,
      loading: true,
      status: { description: 'Queued...' }
    }));
    setBottomPanel('output');
    
    // Save locally first
    workspace.saveFile(workspace.activeFileId);

    socket.emit('run-code', { sessionId, fileId: workspace.activeFileId });
  }, [socket, sessionId, workspace]);

  const handleClearOutput = useCallback(() => {
    setRunResult({
      stdout: '',
      stderr: '',
      time: '',
      memory: '',
      loading: false,
      status: null
    });
  }, []);

  const handleRestoreSnapshot = (code) => {
    console.log('Restored code snapshot successfully. CRDT will sync all clients.');
  };

  // Set up real-time sync hooks
  const {
    roomUsers,
    remoteCursors,
    handleCursorChange
  } = useCollaboration({
    socket,
    sessionId,
    editor,
    activeFileId: workspace.activeFileId,
    monaco,
    openFiles: workspace.openFiles,
    monacoModels: workspace.monacoModels
  });

  const handleEditorMount = (editorInstance, monacoInstance) => {
    setEditor(editorInstance);
    setMonaco(monacoInstance);
    workspace.setEditorInstance(editorInstance);
    workspace.setMonacoInstance(monacoInstance);
  };

  if (loading) {
    return (
      <div className="fullscreen-loader">
        <Loader2 size={40} className="loading-logo-icon animate-spin accent-blue" />
        <p>Loading collaborative session...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="session-stub-container">
        <div className="session-stub-card glass-card">
          <AlertCircle size={48} className="stub-logo-icon error" style={{ color: 'hsl(var(--error))' }} />
          <h2>Connection Failed</h2>
          <p className="stub-desc">{error}</p>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Get active file properties
  const activeFile = workspace.openFiles.find((f) => f.id === workspace.activeFileId);

  return (
    <div className="session-workspace-container flex-column" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Top Menu Bar */}
      <TopBar
        session={session}
        roomUsers={roomUsers}
        onRun={workspace.activeFileId ? handleRunCode : null}
        runLoading={runResult.loading}
        onOpenHistory={workspace.activeFileId ? () => setBottomPanel('history') : null}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onToggleBottomPanel={() => setBottomPanel(bottomPanel ? null : 'output')}
      />

      {/* Main split workspace */}
      <div className="workspace-body flex-row flex-1" style={{ overflow: 'hidden', position: 'relative' }}>
        {/* File Explorer Sidebar */}
        {sidebarOpen && (
          <aside className="explorer-sidebar-container" style={{ width: '250px', flexShrink: 0, borderRight: '1px solid hsl(var(--border))', display: 'flex', flexDirection: 'column' }}>
            <FileExplorer />
          </aside>
        )}

        {/* Editor & Console Stack */}
        <main className="editor-console-stack flex-column flex-1" style={{ overflow: 'hidden', position: 'relative' }}>
          {/* Tab Bar */}
          <TabBar />

          {/* Monaco Editor Pane */}
          {workspace.activeFileId && activeFile ? (
            <div className="editor-container-main flex-1" style={{ position: 'relative', overflow: 'hidden' }}>
              <Editor
                language={activeFile.language}
                onMount={handleEditorMount}
                onCursorChange={handleCursorChange}
                onSave={handleTriggerReview}
                onChange={() => {
                  workspace.markDirty(workspace.activeFileId, true);
                }}
              />
            </div>
          ) : (
            <div className="editor-welcome-placeholder flex-column align-center justify-center flex-1" style={{ color: 'hsl(var(--text-muted))', padding: '48px', textAlign: 'center' }}>
              <Sparkles size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
              <h3>No Active Editor</h3>
              <p style={{ fontSize: '13px', maxWidth: '380px', margin: '4px 0 0 0' }}>
                Open a project folder or select a file from the Workspace Explorer on the left to begin real-time code collaboration.
              </p>
            </div>
          )}

          {/* Bottom Panel (Terminal Output, AI Reviews, History) */}
          <BottomPanel
            activePanel={bottomPanel}
            setActivePanel={setBottomPanel}
            executionResult={runResult}
            onClearOutput={handleClearOutput}
            aiReview={aiReview}
            onTriggerAIReview={handleTriggerReview}
            sessionId={sessionId}
            currentCode={editor ? editor.getValue() : ''}
            activeFileId={workspace.activeFileId}
            onRestoreSnapshot={handleRestoreSnapshot}
          />
        </main>
      </div>

      {/* Dynamic Cursor Overlay layer */}
      {editor && monaco && workspace.activeFileId && (
        <UserCursors
          editor={editor}
          monaco={monaco}
          remoteCursors={remoteCursors}
        />
      )}
    </div>
  );
}

export default function SessionPage() {
  return (
    <WorkspaceProvider>
      <SessionPageContent />
    </WorkspaceProvider>
  );
}
