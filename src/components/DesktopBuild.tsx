// ============================================================
// KEVLA ENGINE — Desktop Build Panel
// Complete guide + tools for packaging as KevlaEditor.exe
// Shows step-by-step instructions, file structure, and config
// ============================================================

import { useState } from 'react';
import { Icon } from './Icons';
import { isElectron } from './WindowChrome';

interface DesktopBuildProps {
  onClose: () => void;
}

// ---- All Electron configuration files that need to be created ----
const CONFIG_FILES: { name: string; path: string; description: string }[] = [
  { name: 'main.js', path: 'electron/main.js', description: 'Electron main process — creates BrowserWindow, handles IPC, file dialogs' },
  { name: 'preload.js', path: 'electron/preload.js', description: 'Secure bridge — exposes window.kevla API to renderer via contextBridge' },
  { name: 'electron-builder.yml', path: 'electron-builder.yml', description: 'NSIS installer config — shortcuts, install path, icons, wizard pages' },
  { name: 'package.json', path: 'package.json', description: 'Updated with Electron deps, main field, and build scripts' },
];

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="db-code-block">
      <div className="db-code-header">
        <span className="db-code-lang">{lang}</span>
        <button className="db-code-copy" onClick={handleCopy}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre className="db-code-content"><code>{code}</code></pre>
    </div>
  );
}

export default function DesktopBuild({ onClose }: DesktopBuildProps) {
  const [activeTab, setActiveTab] = useState<'guide' | 'package' | 'structure' | 'troubleshoot'>('guide');

  const packageJsonContent = `{
  "name": "kevla-editor",
  "version": "1.0.0",
  "description": "KEVLA 3D Game Engine Editor",
  "main": "electron/main.js",
  "author": "KEVLA Engine Team",
  "license": "MIT",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "electron": "electron .",
    "electron:dev": "concurrently \\"vite\\" \\"wait-on http://localhost:5173 && electron .\\"",
    "predist": "vite build",
    "dist": "electron-builder --config electron-builder.yml",
    "dist:win": "electron-builder --win --config electron-builder.yml",
    "dist:mac": "electron-builder --mac --config electron-builder.yml",
    "dist:linux": "electron-builder --linux --config electron-builder.yml"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "three": "^0.183.0",
    "@types/three": "^0.183.0",
    "zustand": "^5.0.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^3.0.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^5.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^7.0.0",
    "electron": "^33.0.0",
    "electron-builder": "^25.0.0",
    "concurrently": "^9.0.0",
    "wait-on": "^8.0.0"
  }
}`;

  const viteConfigContent = `import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  // IMPORTANT: base must be './' for Electron file:// protocol
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    // Output to dist/ folder (Electron loads from here)
    outDir: 'dist',
    emptyOutDir: true,
  },
});`;

  return (
    <div className="kv-modal-overlay" onClick={onClose}>
      <div className="db-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="db-header">
          <div className="db-header-left">
            <div className="db-header-icon">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="#ff8800" strokeWidth="2" />
                <path d="M8 12h8M12 8v8" stroke="#ff8800" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h2 className="db-header-title">Package as Desktop Application</h2>
              <p className="db-header-subtitle">Build KevlaEditor-1.0.0-Setup.exe with NSIS installer</p>
            </div>
          </div>
          <button className="kv-modal-close" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>

        {/* Status bar */}
        <div className="db-status-bar">
          {isElectron ? (
            <div className="db-status-item db-status-active">
              <span className="db-status-dot active" /> Running as Desktop App
            </div>
          ) : (
            <div className="db-status-item">
              <span className="db-status-dot" /> Running in Browser — follow guide below to package
            </div>
          )}
          <div className="db-status-item">
            <Icon name="diamond" size={10} color="#ff8800" /> Target: KevlaEditor-1.0.0-Setup.exe
          </div>
        </div>

        {/* Tabs */}
        <div className="db-tabs">
          {([
            { id: 'guide', label: 'Build Guide', icon: 'file' },
            { id: 'package', label: 'Configuration', icon: 'settings' },
            { id: 'structure', label: 'Project Structure', icon: 'folder' },
            { id: 'troubleshoot', label: 'Troubleshooting', icon: 'info' },
          ] as const).map(tab => (
            <button key={tab.id}
              className={`db-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}>
              <Icon name={tab.icon} size={12} /> {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="db-content">
          {activeTab === 'guide' && (
            <div className="db-guide">
              <div className="db-alert db-alert-info">
                <Icon name="info" size={14} />
                <div>
                  <strong>Prerequisites:</strong> Node.js 18+, npm 9+, and Git must be installed.
                  <br />Windows: also needs Visual Studio Build Tools (for native modules).
                </div>
              </div>

              {/* Step 1 */}
              <div className="db-step">
                <div className="db-step-number">1</div>
                <div className="db-step-content">
                  <h3>Install Electron and build dependencies</h3>
                  <p>Add Electron and electron-builder as dev dependencies:</p>
                  <CodeBlock lang="bash" code={`npm install --save-dev electron@latest electron-builder@latest concurrently@latest wait-on@latest`} />
                </div>
              </div>

              {/* Step 2 */}
              <div className="db-step">
                <div className="db-step-number">2</div>
                <div className="db-step-content">
                  <h3>Update package.json</h3>
                  <p>Replace your <code>package.json</code> with the version shown in the Configuration tab.
                    Key changes: add <code>"main": "electron/main.js"</code> and the new scripts.</p>
                  <CodeBlock lang="json" code={`"main": "electron/main.js",
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "electron": "electron .",
  "electron:dev": "concurrently \\"vite\\" \\"wait-on http://localhost:5173 && electron .\\"",
  "predist": "vite build",
  "dist": "electron-builder --config electron-builder.yml"
}`} />
                </div>
              </div>

              {/* Step 3 */}
              <div className="db-step">
                <div className="db-step-number">3</div>
                <div className="db-step-content">
                  <h3>Update vite.config.ts</h3>
                  <p>Set <code>base: './'</code> so Electron can load assets via <code>file://</code> protocol.
                    Remove the <code>vite-plugin-singlefile</code> plugin (not needed for desktop).</p>
                  <CodeBlock lang="typescript" code={viteConfigContent} />
                </div>
              </div>

              {/* Step 4 */}
              <div className="db-step">
                <div className="db-step-number">4</div>
                <div className="db-step-content">
                  <h3>Verify Electron files exist</h3>
                  <p>The following files should already be in your project (created by KEVLA):</p>
                  <div className="db-file-list">
                    {CONFIG_FILES.map(f => (
                      <div key={f.path} className="db-file-item">
                        <Icon name="file" size={12} color="#61afef" />
                        <code>{f.path}</code>
                        <span className="db-file-desc">{f.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step 5 */}
              <div className="db-step">
                <div className="db-step-number">5</div>
                <div className="db-step-content">
                  <h3>Test in development mode</h3>
                  <p>Run the editor in Electron with hot-reload:</p>
                  <CodeBlock lang="bash" code={`npm run electron:dev`} />
                  <p className="db-note">This starts Vite dev server + Electron simultaneously. The editor opens as a native window.</p>
                </div>
              </div>

              {/* Step 6 */}
              <div className="db-step">
                <div className="db-step-number">6</div>
                <div className="db-step-content">
                  <h3>Build the installer</h3>
                  <p>Generate the Windows NSIS installer:</p>
                  <CodeBlock lang="bash" code={`# Build Vite + package with Electron
npm run dist`} />
                  <div className="db-result">
                    <div className="db-result-icon">📦</div>
                    <div>
                      <strong>Output:</strong>
                      <code className="db-result-path">release/KevlaEditor-1.0.0-Setup.exe</code>
                      <p className="db-note">The installer includes: welcome screen, install location picker, progress bar, finish screen, desktop & start menu shortcuts.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 7 */}
              <div className="db-step">
                <div className="db-step-number">7</div>
                <div className="db-step-content">
                  <h3>Quick Reference — All commands</h3>
                  <CodeBlock lang="bash" code={`# Development (browser)
npm run dev

# Development (desktop with hot-reload)
npm run electron:dev

# Test Electron with built files
npm run build && npm run electron

# Build Windows installer (.exe)
npm run dist

# Build for specific platform
npm run dist:win     # Windows NSIS installer
npm run dist:mac     # macOS DMG
npm run dist:linux   # Linux AppImage + .deb`} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'package' && (
            <div className="db-config">
              <h3 className="db-config-title">
                <Icon name="file" size={14} /> package.json
                <span className="db-config-badge">Required Update</span>
              </h3>
              <p className="db-config-desc">Replace your current package.json with this version. It adds the Electron entry point, build scripts, and dev dependencies.</p>
              <CodeBlock lang="json" code={packageJsonContent} />

              <h3 className="db-config-title" style={{ marginTop: 24 }}>
                <Icon name="settings" size={14} /> vite.config.ts
                <span className="db-config-badge">Required Update</span>
              </h3>
              <p className="db-config-desc">Updated Vite config with <code>base: './'</code> for Electron file:// protocol compatibility.</p>
              <CodeBlock lang="typescript" code={viteConfigContent} />

              <h3 className="db-config-title" style={{ marginTop: 24 }}>
                <Icon name="settings" size={14} /> electron-builder.yml
                <span className="db-config-badge green">Already Created</span>
              </h3>
              <p className="db-config-desc">NSIS installer configuration. Already exists in your project root.</p>
              <div className="db-config-features">
                <div className="db-feature-item"><span className="db-check">✓</span> Welcome screen</div>
                <div className="db-feature-item"><span className="db-check">✓</span> Install location selection</div>
                <div className="db-feature-item"><span className="db-check">✓</span> Installation progress bar</div>
                <div className="db-feature-item"><span className="db-check">✓</span> Finish screen with launch option</div>
                <div className="db-feature-item"><span className="db-check">✓</span> Desktop shortcut</div>
                <div className="db-feature-item"><span className="db-check">✓</span> Start Menu shortcut</div>
                <div className="db-feature-item"><span className="db-check">✓</span> Install to Program Files</div>
                <div className="db-feature-item"><span className="db-check">✓</span> Uninstaller included</div>
              </div>
            </div>
          )}

          {activeTab === 'structure' && (
            <div className="db-structure">
              <h3>Project Structure After Setup</h3>
              <pre className="db-tree">{`KevlaEditor/
├── electron/
│   ├── main.js                    ← Electron main process
│   ├── preload.js                 ← Secure IPC bridge
│   └── resources/
│       ├── icon.ico               ← App icon (Windows)
│       ├── icon.icns              ← App icon (macOS)
│       ├── installerSidebar.bmp   ← NSIS sidebar image
│       └── README.md              ← Icon creation guide
│
├── src/
│   ├── components/
│   │   ├── WindowChrome.tsx       ← Updated: real Electron IPC
│   │   ├── DesktopBuild.tsx       ← This panel
│   │   ├── Viewport.tsx
│   │   ├── Hierarchy.tsx
│   │   ├── Inspector.tsx
│   │   ├── BottomPanel.tsx
│   │   ├── Timeline.tsx
│   │   ├── Icons.tsx
│   │   ├── SplashScreen.tsx
│   │   ├── BuildPanel.tsx
│   │   └── ExportManager.tsx
│   │
│   ├── engine/
│   │   ├── store.ts
│   │   ├── types.ts
│   │   ├── physics.ts
│   │   ├── lua.ts
│   │   ├── temporal.ts
│   │   ├── parallel.ts
│   │   └── buildSystem.ts
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
│
├── dist/                          ← Vite build output (loaded by Electron)
│   └── index.html
│
├── release/                       ← Electron Builder output
│   └── KevlaEditor-1.0.0-Setup.exe
│
├── electron-builder.yml           ← NSIS installer config
├── package.json                   ← Updated with Electron scripts
├── vite.config.ts                 ← Updated with base: './'
├── tsconfig.json
└── index.html`}</pre>

              <h3 style={{ marginTop: 20 }}>Build Pipeline</h3>
              <div className="db-pipeline">
                <div className="db-pipeline-step">
                  <div className="db-pipeline-icon">⚡</div>
                  <div className="db-pipeline-label">Vite Build</div>
                  <div className="db-pipeline-desc">React + TS → dist/</div>
                </div>
                <div className="db-pipeline-arrow">→</div>
                <div className="db-pipeline-step">
                  <div className="db-pipeline-icon">📦</div>
                  <div className="db-pipeline-label">Electron Builder</div>
                  <div className="db-pipeline-desc">Package dist/ + electron/</div>
                </div>
                <div className="db-pipeline-arrow">→</div>
                <div className="db-pipeline-step">
                  <div className="db-pipeline-icon">🪟</div>
                  <div className="db-pipeline-label">NSIS Compiler</div>
                  <div className="db-pipeline-desc">Create .exe installer</div>
                </div>
                <div className="db-pipeline-arrow">→</div>
                <div className="db-pipeline-step highlight">
                  <div className="db-pipeline-icon">✅</div>
                  <div className="db-pipeline-label">KevlaEditor.exe</div>
                  <div className="db-pipeline-desc">release/ folder</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'troubleshoot' && (
            <div className="db-troubleshoot">
              <div className="db-faq">
                <h4>❓ "electron" is not recognized as a command</h4>
                <p>Make sure Electron is installed as a dev dependency:</p>
                <CodeBlock lang="bash" code="npm install --save-dev electron" />
              </div>

              <div className="db-faq">
                <h4>❓ White screen when opening Electron</h4>
                <p>The <code>dist/</code> folder doesn't exist. Build first:</p>
                <CodeBlock lang="bash" code="npm run build" />
                <p>Then run <code>npm run electron</code>.</p>
              </div>

              <div className="db-faq">
                <h4>❓ Assets not loading (404 errors)</h4>
                <p>Make sure <code>vite.config.ts</code> has <code>base: './'</code> instead of <code>base: '/'</code>.</p>
              </div>

              <div className="db-faq">
                <h4>❓ NSIS installer build fails</h4>
                <p>On Windows, you may need to run as Administrator or disable antivirus temporarily. Also ensure you have at least 2GB free disk space.</p>
              </div>

              <div className="db-faq">
                <h4>❓ Where is the final .exe?</h4>
                <p>After <code>npm run dist</code>, check:</p>
                <CodeBlock lang="text" code="release/KevlaEditor-1.0.0-Setup.exe" />
              </div>

              <div className="db-faq">
                <h4>❓ How to add a custom app icon?</h4>
                <p>Place a 256×256 <code>.ico</code> file at <code>electron/resources/icon.ico</code>. See the README in that folder for details.</p>
              </div>

              <div className="db-faq">
                <h4>❓ Can I build for macOS from Windows?</h4>
                <p>No. macOS builds require a Mac. Use a CI/CD service like GitHub Actions with a macOS runner.</p>
              </div>

              <div className="db-faq">
                <h4>❓ How do I enable code signing?</h4>
                <p>Add to <code>electron-builder.yml</code>:</p>
                <CodeBlock lang="yaml" code={`win:
  certificateFile: path/to/certificate.pfx
  certificatePassword: YOUR_PASSWORD`} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
