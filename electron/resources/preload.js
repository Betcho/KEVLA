// ============================================================
// KEVLA ENGINE EDITOR — Electron Preload Script
// Secure bridge between renderer process and Node.js/Electron APIs
// Uses contextBridge to expose only specific, safe functions
// ============================================================

const { contextBridge, ipcRenderer } = require('electron');

// ============================================================
// Expose KEVLA API to the renderer process
// Accessible via window.kevla in the React app
// ============================================================

contextBridge.exposeInMainWorld('kevla', {
  // ---- Platform detection ----
  isDesktop: true,
  platform: process.platform,
  arch: process.arch,

  // ---- Window controls (for custom title bar) ----
  window: {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  },

  // ---- File dialogs ----
  dialog: {
    openDirectory: () => ipcRenderer.invoke('dialog-open-directory'),
    openFile: (filters) => ipcRenderer.invoke('dialog-open-file', filters),
    saveFile: (defaultName) => ipcRenderer.invoke('dialog-save-file', defaultName),
  },

  // ---- File system operations ----
  fs: {
    readFile: (filePath) => ipcRenderer.invoke('fs-read-file', filePath),
    writeFile: (filePath, content) => ipcRenderer.invoke('fs-write-file', filePath, content),
    listDirectory: (dirPath) => ipcRenderer.invoke('fs-list-directory', dirPath),
    ensureDirectory: (dirPath) => ipcRenderer.invoke('fs-ensure-directory', dirPath),
  },

  // ---- App information ----
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
});

// ============================================================
// Log that preload completed
// ============================================================
console.log('[KEVLA] Preload script loaded — desktop APIs available via window.kevla');
