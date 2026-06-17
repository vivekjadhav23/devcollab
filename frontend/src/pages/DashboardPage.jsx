import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Plus, LogOut, Terminal, Users, Code, ArrowRight, Activity, HelpCircle } from 'lucide-react';
import { StarsBackground } from '../components/ui/stars-background';
import { ShootingStars } from '../components/ui/shooting-stars';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [sessions, setSessions] = useState([]);
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await api.get('/sessions');
      setSessions(response.data);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/sessions', { title, language });
      navigate(`/session/${response.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSession = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/sessions/join', { inviteCode });
      navigate(`/session/${response.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join session. Please check invite code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-wrapper">
      <StarsBackground starDensity={0.00015} allStarsTwinkle={true} />
      <ShootingStars minSpeed={8} maxSpeed={20} />
      <div className="dashboard-container">
      {/* Header bar */}
      <header className="dashboard-header glass-card">
        <div className="flex-row gap-8">
          <Code size={28} className="header-logo" />
          <span className="brand-name">Dev<span className="gradient-text">Collab</span></span>
        </div>
        
        {user && (
          <div className="user-profile-widget">
            <img src={user.avatarUrl} alt={user.username} className="user-avatar" />
            <span className="user-name">{user.username}</span>
            <button onClick={logout} className="btn btn-outline logout-btn" title="Sign Out">
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        )}
      </header>

      {error && <div className="error-alert">{error}</div>}

      {/* Bento Grid layout */}
      <main className="bento-grid">
        
        {/* Block 1: Create Workspace (Col-Span-2) */}
        <div className="bento-item create-workspace-block glass-card">
          <div className="card-header">
            <Plus size={22} className="accent-blue" />
            <h2>Create Workspace</h2>
          </div>
          <p className="card-description">Create a new private workspace room to write, run, and review code with others.</p>
          
          <form onSubmit={handleCreateSession} className="workspace-form">
            <div className="form-row">
              <div className="form-group flex-1">
                <label className="form-label">Workspace Title</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Practise Algorithms, API debug"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group select-group">
                <label className="form-label">Language</label>
                <select 
                  className="form-input" 
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="cpp">C++</option>
                  <option value="java">Java</option>
                </select>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary create-btn">
              <span>Create Workspace</span>
              <ArrowRight size={16} />
            </button>
          </form>
        </div>

        {/* Block 2: Join Workspace (Col-Span-1) */}
        <div className="bento-item join-workspace-block glass-card">
          <div className="card-header">
            <Users size={22} className="accent-blue" />
            <h2>Join via Code</h2>
          </div>
          <p className="card-description">Enter a 6-character room code shared by your teammates.</p>
          
          <form onSubmit={handleJoinSession}>
            <div className="form-group">
              <label className="form-label">Invite Code</label>
              <input 
                type="text" 
                className="form-input invite-input" 
                placeholder="e.g. AB3X7K"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                maxLength={6}
                required 
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-secondary w-full join-btn">
              <span>Join Room</span>
              <ArrowRight size={16} />
            </button>
          </form>
        </div>

        {/* Block 3: Active Workspaces (Col-Span-2) */}
        <section className="bento-item active-workspaces-block glass-card">
          <div className="card-header">
            <Terminal size={22} className="accent-blue" />
            <h2>Your Active Workspaces</h2>
          </div>
          
          {sessions.length === 0 ? (
            <div className="empty-sessions">
              <Terminal size={40} className="empty-icon" />
              <h3>No workspaces active</h3>
              <p>Create a workspace or enter an invite code to begin pairing.</p>
            </div>
          ) : (
            <div className="sessions-list">
              {sessions.map((session) => (
                <div 
                  key={session._id} 
                  className="session-row glass-card"
                  onClick={() => navigate(`/session/${session._id}`)}
                >
                  <div className="session-info">
                    <span className="session-lang-tag">{session.language}</span>
                    <div>
                      <h3>{session.title}</h3>
                      <p className="session-owner">Owner: {session.owner?.username || 'Unknown'}</p>
                    </div>
                  </div>
                  <div className="session-meta">
                    <div className="session-participants">
                      <Users size={14} />
                      <span>{session.participants?.length || 1} participant(s)</span>
                    </div>
                    <div className="session-code-badge">
                      Code: <strong>{session.inviteCode}</strong>
                    </div>
                    <ArrowRight size={18} className="arrow-hover" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Block 4: Developer Tips & System Status (Col-Span-1) */}
        <div className="bento-item developer-tips-block glass-card">
          <div className="card-header">
            <Activity size={20} className="accent-cyan" />
            <h2>System Status & Tips</h2>
          </div>
          
          <div className="status-grid">
            <div className="status-item">
              <span className="status-dot green"></span>
              <span className="status-label">Database connection: <strong>Online</strong></span>
            </div>
            <div className="status-item">
              <span className="status-dot green"></span>
              <span className="status-label">Redis store: <strong>Mock Fallback</strong></span>
            </div>
            <div className="status-item">
              <span className="status-dot green"></span>
              <span className="status-label">Collaborative socket: <strong>Active</strong></span>
            </div>
          </div>

          <div className="bento-divider"></div>

          <div className="tips-list">
            <div className="tip-header">
              <HelpCircle size={16} className="accent-blue" />
              <h3>Quick Pairing Tips</h3>
            </div>
            <ul>
              <li>Share the 6-digit invite code for real-time multiplayer code pairing.</li>
              <li>Silent JWT token rotation automatically keeps your workspace secure in the background.</li>
              <li>Week 2 Monaco Editor integration will enable complete VSCode keyboard shortcuts.</li>
            </ul>
          </div>
        </div>

      </main>
    </div>
  </div>
);
}
