import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import AuthSuccessPage from './pages/AuthSuccessPage';
import DashboardPage from './pages/DashboardPage';
import SessionPage from './pages/SessionPage';
import { Code } from 'lucide-react';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="fullscreen-loader">
        <Code size={48} className="loading-logo-icon animate-pulse" />
        <p>Verifying secure session...</p>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="fullscreen-loader">
        <Code size={48} className="loading-logo-icon animate-pulse" />
        <p>Verifying secure session...</p>
      </div>
    );
  }

  return !user ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <div className="app-container">
        <Router>
          <Routes>
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              } 
            />
            <Route path="/auth/success" element={<AuthSuccessPage />} />
            <Route 
              path="/dashboard" 
              element={
                <PrivateRoute>
                  <DashboardPage />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/session/:sessionId" 
              element={
                <PrivateRoute>
                  <SessionPage />
                </PrivateRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </div>
    </AuthProvider>
  );
}
