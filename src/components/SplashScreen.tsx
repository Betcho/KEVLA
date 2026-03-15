// ============================================================
// KEVLA ENGINE — Splash Screen
// Shows on launch like a native .exe application
// ============================================================

import { useState, useEffect } from 'react';

interface SplashProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashProps) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Initializing engine...');
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const steps = [
      { p: 8, s: 'Loading OpenGL 4.5 context...' },
      { p: 15, s: 'Initializing GLAD function loader...' },
      { p: 22, s: 'Creating GLFW window (1920×1080)...' },
      { p: 30, s: 'Compiling PBR vertex shader...' },
      { p: 38, s: 'Compiling PBR fragment shader...' },
      { p: 42, s: 'Linking shader program...' },
      { p: 48, s: 'Generating primitive meshes (6)...' },
      { p: 55, s: 'Initializing Bullet Physics world...' },
      { p: 60, s: 'Setting gravity: (0, -9.81, 0)...' },
      { p: 65, s: 'Initializing Lua 5.4 VM...' },
      { p: 70, s: 'Registering sol2 entity bindings...' },
      { p: 75, s: 'Setting up ImGui docking context...' },
      { p: 78, s: 'Applying dark theme...' },
      { p: 82, s: 'Loading project configuration...' },
      { p: 86, s: 'Initializing Temporal Engine...' },
      { p: 90, s: 'Configuring Electron IPC bridge...' },
      { p: 94, s: 'Initializing NSIS build system...' },
      { p: 97, s: 'Creating default scene...' },
      { p: 100, s: 'Ready.' },
    ];

    let idx = 0;
    const interval = setInterval(() => {
      if (idx < steps.length) {
        setProgress(steps[idx].p);
        setStatus(steps[idx].s);
        idx++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setFadeOut(true);
          setTimeout(onComplete, 600);
        }, 400);
      }
    }, 120);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className={`splash-overlay ${fadeOut ? 'fade-out' : ''}`}>
      <div className="splash-card">
        {/* Logo */}
        <div className="splash-logo-area">
          <div className="splash-diamond">
            <svg viewBox="0 0 60 60" width="60" height="60">
              <defs>
                <linearGradient id="dg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff8800" />
                  <stop offset="100%" stopColor="#ff4400" />
                </linearGradient>
              </defs>
              <polygon points="30,2 58,30 30,58 2,30" fill="url(#dg)" opacity="0.9" />
              <polygon points="30,10 50,30 30,50 10,30" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.5" />
              <polygon points="30,18 42,30 30,42 18,30" fill="none" stroke="#fff" strokeWidth="1" opacity="0.3" />
            </svg>
          </div>
          <h1 className="splash-title">KEVLA</h1>
          <p className="splash-subtitle">Keystone Engine for Virtual Landscapes & Adventures</p>
        </div>

        {/* Progress */}
        <div className="splash-progress-area">
          <div className="splash-progress-track">
            <div className="splash-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="splash-progress-info">
            <span className="splash-status">{status}</span>
            <span className="splash-percent">{progress}%</span>
          </div>
        </div>

        {/* System Info */}
        <div className="splash-sysinfo">
          <div className="splash-info-row">
            <span>Engine</span><span>KEVLA v1.0.0</span>
          </div>
          <div className="splash-info-row">
            <span>Graphics</span><span>OpenGL 4.5 Core</span>
          </div>
          <div className="splash-info-row">
            <span>Physics</span><span>Bullet Physics 3.25</span>
          </div>
          <div className="splash-info-row">
            <span>Scripting</span><span>Lua 5.4.6 + sol2</span>
          </div>
          <div className="splash-info-row">
            <span>UI</span><span>ImGui (Docking)</span>
          </div>
          <div className="splash-info-row">
            <span>Platform</span><span>Windows x64</span>
          </div>
        </div>

        <div className="splash-footer">
          <span>© 2026 KEVLA Engine</span>
          <span>KevlaEditor v1.0.0</span>
        </div>
      </div>
    </div>
  );
}
