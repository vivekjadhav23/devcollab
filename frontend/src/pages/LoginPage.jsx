import React, { useRef } from 'react';
import { Github, Code, Users, Zap, Terminal, Sparkles, History, HardDrive, ArrowDown } from 'lucide-react';
import { MacbookScroll } from '../components/ui/macbook-scroll';
import { StarsBackground } from '../components/ui/stars-background';
import { ShootingStars } from '../components/ui/shooting-stars';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" style={{ marginRight: '2px' }} fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

// Peerlist logo badge component
const Badge = ({ className }) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M56 28C56 43.464 43.464 56 28 56C12.536 56 0 43.464 0 28C0 12.536 12.536 0 28 0C43.464 0 56 12.536 56 28Z"
        fill="#00AA45"
      ></path>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M28 54C42.3594 54 54 42.3594 54 28C54 13.6406 42.3594 2 28 2C13.6406 2 2 13.6406 2 28C2 42.3594 13.6406 54 28 54ZM28 56C43.464 56 56 43.464 56 28C56 12.536 43.464 0 28 0C12.536 0 0 12.536 0 28C0 43.464 12.536 56 28 56Z"
        fill="#219653"
      ></path>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M27.0769 12H15V46H24.3846V38.8889H27.0769C34.7305 38.8889 41 32.9048 41 25.4444C41 17.984 34.7305 12 27.0769 12ZM24.3846 29.7778V21.1111H27.0769C29.6194 21.1111 31.6154 23.0864 31.6154 25.4444C31.6154 27.8024 29.6194 29.7778 27.0769 29.7778H24.3846Z"
        fill="#24292E"
      ></path>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18 11H29.0769C36.2141 11 42 16.5716 42 23.4444C42 30.3173 36.2141 35.8889 29.0769 35.8889H25.3846V43H18V11ZM25.3846 28.7778H29.0769C32.1357 28.7778 34.6154 26.39 34.6154 23.4444C34.6154 20.4989 32.1357 18.1111 29.0769 18.1111H25.3846V28.7778Z"
        fill="white"
      ></path>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17 10H29.0769C36.7305 10 43 15.984 43 23.4444C43 30.9048 36.7305 36.8889 29.0769 36.8889H26.3846V44H17V10ZM19 12V42H24.3846V34.8889H29.0769C35.6978 34.8889 41 29.7298 41 23.4444C41 17.1591 35.6978 12 29.0769 12H19ZM24.3846 17.1111H29.0769C32.6521 17.1111 35.6154 19.9114 35.6154 23.4444C35.6154 26.9775 32.6521 29.7778 29.0769 29.7778H24.3846V17.1111ZM26.3846 19.1111V27.7778H29.0769C31.6194 27.7778 33.6154 25.8024 33.6154 23.4444C33.6154 21.0864 31.6194 19.1111 29.0769 19.1111H26.3846Z"
        fill="#24292E"
      ></path>
    </svg>
  );
};

export default function LoginPage() {
  const loginSectionRef = useRef(null);

  const handleGithubLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/github`;
  };

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/google`;
  };

  const scrollToLogin = () => {
    loginSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="login-page-scroll-container">
      {/* Live Cosmic Background */}
      <StarsBackground starDensity={0.00015} allStarsTwinkle={true} />
      <ShootingStars minSpeed={12} maxSpeed={28} />

      {/* Floating Landing Header */}
      <header className="landing-navbar">
        <div className="landing-logo">
          <Code className="accent-blue" size={24} />
          <span>Dev<span className="gradient-text">Collab</span></span>
        </div>
        <button onClick={scrollToLogin} className="btn btn-secondary nav-action-btn">
          Sign In
        </button>
      </header>

      {/* Hero Section */}
      <section className="landing-hero-section">
        <div className="hero-content">
          <div className="hero-announcement">
            <span className="announcement-badge">New Version 2.0</span>
            <span className="announcement-text">Now with local folder synchronization</span>
          </div>
          <h1 className="hero-title">
            The Collaborative Space <br />
            For <span className="gradient-text">Next-Gen</span> Developers.
          </h1>
          <p className="hero-subtitle">
            Pair program in real-time, audit code with Google Gemini, execute sandboxed terminals, and sync disk directories directly from your browser.
          </p>
          <div className="hero-cta-buttons">
            <button onClick={scrollToLogin} className="btn btn-primary cta-btn">
              Get Started Free
            </button>
            <button onClick={scrollToLogin} className="btn btn-outline cta-btn outline-cta">
              Explore Features <ArrowDown size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* MacBook Showcase */}
      <section className="macbook-scroll-section">
        <MacbookScroll
          title={
            <span>
              Authoritative workspace. <br /> Synchronized instantly.
            </span>
          }
          badge={
            <a href="https://peerlist.io/manuarora" target="_blank" rel="noopener noreferrer">
              <Badge className="h-10 w-10 -rotate-12 transform" />
            </a>
          }
          src="/editor_preview.png"
          showGradient={false}
        />
      </section>

      {/* Premium Features Grid (Bento style) */}
      <section className="landing-features-grid-section">
        <div className="section-header">
          <span className="section-tag">CAPABILITIES</span>
          <h2 className="section-title">Built for high-performance engineering.</h2>
          <p className="section-desc">
            Everything you need for seamless development, direct workspace reviews, and isolated compilations.
          </p>
        </div>

        <div className="features-bento-grid">
          <div className="bento-card bento-span-2">
            <div className="bento-icon-wrapper purple">
              <Users size={20} />
            </div>
            <div className="bento-body">
              <h3>Conflict-Free Real-Time Pairing</h3>
              <p>
                Powered by Yjs CRDT synchronization. Edit code concurrently with live multi-user cursor flags, custom namespacing, and conflict-free concurrent keystroke merging.
              </p>
            </div>
          </div>

          <div className="bento-card">
            <div className="bento-icon-wrapper cyan">
              <Sparkles size={20} />
            </div>
            <div className="bento-body">
              <h3>Gemini Code Review</h3>
              <p>
                Get instant code audits, security audits, and complexity estimators on save by Google Gemini AI.
              </p>
            </div>
          </div>

          <div className="bento-card">
            <div className="bento-icon-wrapper pink">
              <Zap size={20} />
            </div>
            <div className="bento-body">
              <h3>Live Sandboxed Compiler</h3>
              <p>
                Run Node.js and Python scripts in real-time. Fetches compiler stats, memory usage, and formats errors.
              </p>
            </div>
          </div>

          <div className="bento-card bento-span-2">
            <div className="bento-icon-wrapper blue">
              <HardDrive size={20} />
            </div>
            <div className="bento-body">
              <h3>Direct Disk Access & Sync</h3>
              <p>
                Utilizes the browser-native File System Access API. Open folders directly, persistence with IndexedDB, and automatically sync Guest-to-Host edits straight onto the host's directory disk.
              </p>
            </div>
          </div>

          <div className="bento-card bento-span-3">
            <div className="bento-icon-wrapper green">
              <History size={20} />
            </div>
            <div className="bento-body">
              <h3>Interactive Diff History</h3>
              <p>
                Runs auto-backups every 5 minutes with automatic 30-day TTL indexes. Preview differences with Monaco Split Diff editor and revert to older versions with a single click.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Login Card Section */}
      <section ref={loginSectionRef} className="landing-login-section">
        <div className="login-wrapper">
          <div className="login-glass-container glass-card">
            <div className="brand-header">
              <div className="logo-badge">
                <Code size={32} className="logo-icon" />
              </div>
              <h1>Welcome to Dev<span className="gradient-text">Collab</span></h1>
              <p className="subtitle">Choose a login provider to access your workspace dashboards.</p>
            </div>

            <div className="login-actions">
              <button onClick={handleGithubLogin} className="btn login-btn github-login-btn">
                <Github size={20} />
                <span>Continue with GitHub</span>
              </button>

              <button onClick={handleGoogleLogin} className="btn login-btn google-login-btn">
                <GoogleIcon />
                <span>Continue with Google</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Landing Footer */}
      <footer className="landing-footer">
        <p>&copy; {new Date().getFullYear()} DevCollab. Crafted with care for developer collaboration.</p>
      </footer>
    </div>
  );
}
