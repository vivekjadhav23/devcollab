import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Code } from 'lucide-react';

export default function AuthSuccessPage() {
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const loginCalled = useRef(false);

  useEffect(() => {
    if (loginCalled.current) return;
    const token = searchParams.get('token');
    if (token) {
      loginCalled.current = true;
      // Pass token to AuthContext which saves in memory and fetches user profile
      login(token).then(() => {
        navigate('/dashboard');
      });
    } else {
      navigate('/login?error=missing_callback_token');
    }
  }, [login, navigate, searchParams]);

  return (
    <div className="loading-auth-container">
      <div className="auth-loader-glass glass-card">
        <Code size={48} className="loading-logo-icon animate-pulse" />
        <h2>Authenticating Workspace</h2>
        <p>Syncing secure keys with DevCollab server, please wait...</p>
      </div>
    </div>
  );
}
