// ============================================================
// KEVLA ENGINE — Native Window Chrome
// When running in Electron: uses real IPC for minimize/maximize/close
// When running in browser: simulates desktop window appearance
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { Icon } from './Icons';

// ---- Electron API type (exposed via preload.js) ----
interface KevlaDesktopAPI {
  isDesktop: boolean;
  platform: string;
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    isMaximized: () => Promise<boolean>;
  };
  dialog: {
    openDirectory: () => Promise<string | null>;
    openFile: (filters?: unknown) => Promise<string | null>;
    saveFile: (defaultName?: string) => Promise<string | null>;
  };
  fs: {
    readFile: (path: string) => Promise<string | { error: string }>;
    writeFile: (path: string, content: string) => Promise<{ success?: boolean; error?: string }>;
    listDirectory: (path: string) => Promise<Array<{ name: string; isDirectory: boolean; path: string }> | { error: string }>;
    ensureDirectory: (path: string) => Promise<{ success?: boolean; error?: string }>;
  };
  getAppInfo: () => Promise<Record<string, string>>;
}

// Access the API exposed by preload.js
const kevlaAPI = (window as unknown as { kevla?: KevlaDesktopAPI }).kevla;
const isElectron = !!kevlaAPI?.isDesktop;

interface WindowChromeProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function WindowChrome({ title, subtitle, children }: WindowChromeProps) {
  const [isMaximized, setIsMaximized] = useState(true);

  // ---- Sync maximized state with Electron ----
  useEffect(() => {
    if (!isElectron) return;
    const checkMaximized = async () => {
      const maximized = await kevlaAPI!.window.isMaximized();
      setIsMaximized(maximized);
    };
    checkMaximized();
    // Poll for changes (Electron doesn't have a resize event via IPC easily)
    const interval = setInterval(checkMaximized, 1000);
    return () => clearInterval(interval);
  }, []);

  // ---- Window control handlers ----
  const handleMinimize = useCallback(() => {
    if (isElectron) {
      kevlaAPI!.window.minimize();
    }
  }, []);

  const handleMaximize = useCallback(() => {
    if (isElectron) {
      kevlaAPI!.window.maximize();
      // Toggle local state
      setIsMaximized(prev => !prev);
    }
  }, []);

  const handleClose = useCallback(() => {
    if (isElectron) {
      kevlaAPI!.window.close();
    }
  }, []);

  return (
    <div className={`wc-window ${isMaximized ? 'maximized' : ''}`}>
      {/* Native title bar — draggable region */}
      <div className="wc-titlebar" style={isElectron ? { WebkitAppRegion: 'drag' } as React.CSSProperties : undefined}>
        <div className="wc-titlebar-left">
          <div className="wc-app-icon">
            <svg viewBox="0 0 16 16" width="14" height="14">
              <defs>
                <linearGradient id="wcg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff8800" />
                  <stop offset="100%" stopColor="#ff4400" />
                </linearGradient>
              </defs>
              <polygon points="8,1 15,8 8,15 1,8" fill="url(#wcg)" />
            </svg>
          </div>
          <span className="wc-title">{title}</span>
          {subtitle && <span className="wc-subtitle">— {subtitle}</span>}
          {isElectron && <span className="wc-desktop-badge">Desktop</span>}
        </div>
        <div className="wc-controls" style={isElectron ? { WebkitAppRegion: 'no-drag' } as React.CSSProperties : undefined}>
          <button className="wc-btn wc-minimize" title="Minimize" onClick={handleMinimize}>
            <Icon name="minus" size={10} />
          </button>
          <button className="wc-btn wc-maximize" title={isMaximized ? 'Restore' : 'Maximize'} onClick={handleMaximize}>
            {isMaximized ? (
              <svg viewBox="0 0 10 10" width="10" height="10">
                <rect x="2" y="0" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.2" />
                <rect x="0" y="2" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            ) : (
              <svg viewBox="0 0 10 10" width="10" height="10">
                <rect x="1" y="1" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            )}
          </button>
          <button className="wc-btn wc-close" title="Close" onClick={handleClose}>
            <Icon name="x" size={10} />
          </button>
        </div>
      </div>
      {/* App content */}
      <div className="wc-content">
        {children}
      </div>
    </div>
  );
}

// ---- Export for other components to use ----
export { isElectron, kevlaAPI };
export type { KevlaDesktopAPI };
