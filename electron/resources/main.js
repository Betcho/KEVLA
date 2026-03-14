const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// ---- Prevent multiple instances ----
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

// ---- Global reference to main window ----
let mainWindow = null;

// ---- App metadata ----
const APP_NAME = 'KEVLA Editor';
const APP_VERSION = '1.0.0';

// ============================================================
// Create the main editor window
// ============================================================
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 1280,
    minHeight: 720,
    title: `${APP_NAME} v${APP_VERSION}`,
    icon: path.join(__dirname, 'icon.ico'),

    // Frameless window — we use our own custom title bar
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: false,

    // Background color matches our dark theme
    backgroundColor: '#0a0a0c',

    // Web preferences
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      spellcheck: false,
      devTools: true,
    },

    // Window behavior
    show: false, // Don't show until ready
    autoHideMenuBar: true,
  });

  // ---- Load the built Vite app from dist/ ----
  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');

  if (fs.existsSync(indexPath)) {
    // Production: load built files
    mainWindow.loadFile(indexPath);
  } else {
    // Development: load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');
  }

  // ---- Show window when content is ready (avoids white flash) ----
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // ---- Handle external links ----
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // ---- Cleanup on close ----
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ============================================================
// IPC Handlers — Communication between renderer and main process
// ============================================================

// Window control commands from our custom title bar
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// ---- File system access for project management ----
ipcMain.handle('dialog-open-directory', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Project Directory',
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('dialog-open-file', async (_event, filters) => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    title: 'Open File',
    filters: filters || [
      { name: '3D Models', extensions: ['obj', 'gltf', 'glb', 'fbx', 'dae'] },
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'bmp', 'tga'] },
      { name: 'Scripts', extensions: ['lua'] },
      { name: 'Scenes', extensions: ['json', 'scene'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('dialog-save-file', async (_event, defaultName) => {
  if (!mainWindow) return null;
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save File',
    defaultPath: defaultName || 'scene.json',
    filters: [
      { name: 'Scene Files', extensions: ['json', 'scene'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  return result.canceled ? null : result.filePath;
});

ipcMain.handle('fs-read-file', async (_event, filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('fs-write-file', async (_event, filePath, content) => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('fs-list-directory', async (_event, dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) return { error: 'Directory not found' };
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries.map(e => ({
      name: e.name,
      isDirectory: e.isDirectory(),
      path: path.join(dirPath, e.name),
    }));
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('fs-ensure-directory', async (_event, dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
});

// ---- App info ----
ipcMain.handle('get-app-info', () => ({
  name: APP_NAME,
  version: APP_VERSION,
  platform: process.platform,
  arch: process.arch,
  electron: process.versions.electron,
  node: process.versions.node,
  chrome: process.versions.chrome,
  v8: process.versions.v8,
  appPath: app.getAppPath(),
  userData: app.getPath('userData'),
  documents: app.getPath('documents'),
}));

// ============================================================
// Application menu (minimal — our custom menu handles most things)
// ============================================================
function createAppMenu() {
  const template = [
    {
      label: APP_NAME,
      submenu: [
        { label: `About ${APP_NAME}`, role: 'about' },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ============================================================
// App lifecycle
// ============================================================

app.whenReady().then(() => {
  createAppMenu();
  createWindow();

  app.on('activate', () => {
    // macOS: re-create window when dock icon clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Handle second instance attempt
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// Quit when all windows are closed (except macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: prevent new window creation
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event) => {
    event.preventDefault();
  });
});

