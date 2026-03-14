# KEVLA Editor — Build Instructions

## Overview

KEVLA Editor can run in two modes:

| Mode | Command | Description |
|------|---------|-------------|
| **Browser** | `npm run dev` | Development in browser with hot reload |
| **Desktop** | `npm run electron:dev` | Native Electron app with hot reload |
| **Installer** | `npm run dist` | Packaged `.exe` installer |

---

## Prerequisites

| Requirement | Version | Download |
|-------------|---------|----------|
| Node.js | 18+ | [nodejs.org](https://nodejs.org/) |
| npm | 9+ | Included with Node.js |
| Git | Latest | [git-scm.com](https://git-scm.com/) |
| VS Build Tools | 2019+ | Windows only, for native Electron modules |

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/your-username/kevla.git
cd kevla
npm install
```

### 2. Run in Browser (Development)

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### 3. Run as Desktop App (Development)

```bash
# Install Electron dependencies (first time only)
npm install --save-dev electron@latest electron-builder@latest concurrently@latest wait-on@latest

# Launch with hot reload
npm run electron:dev
```

---

## Building the Installer

### Step 1: Update package.json

Add these fields:

```json
{
  "main": "electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "electron": "electron .",
    "electron:dev": "concurrently \"vite\" \"wait-on http://localhost:5173 && electron .\"",
    "predist": "vite build",
    "dist": "electron-builder --config electron-builder.yml",
    "dist:win": "electron-builder --config electron-builder.yml --win",
    "dist:mac": "electron-builder --config electron-builder.yml --mac",
    "dist:linux": "electron-builder --config electron-builder.yml --linux"
  }
}
```

### Step 2: Update vite.config.ts

```typescript
export default defineConfig({
  base: './',  // <-- Required for Electron file:// loading
  plugins: [react(), tailwindcss()],
  // Remove vite-plugin-singlefile if present
});
```

### Step 3: Build

```bash
npm run dist
```

### Step 4: Find Your Installer

```
release/KevlaEditor-1.0.0-Setup.exe
```

---

## Installer Details

### Windows (NSIS)

| Feature | Status |
|---------|--------|
| Welcome screen | ✅ |
| Install location picker | ✅ (default: `C:\Program Files\KEVLA Editor`) |
| Progress bar | ✅ |
| Finish screen with launch option | ✅ |
| Desktop shortcut | ✅ |
| Start Menu shortcut (under KEVLA Engine) | ✅ |
| Uninstaller in Add/Remove Programs | ✅ |

### Installer File

| Field | Value |
|-------|-------|
| Name | KEVLA Editor |
| Version | 1.0.0 |
| Release Date | March 13, 2026 |
| Installer Title | KEVLA Editor Setup v1.0.0 |
| Filename | `KevlaEditor-1.0.0-Setup.exe` |
| Estimated Size | ~85 MB |

---

## Cross-Platform Builds

| Platform | Command | Output |
|----------|---------|--------|
| Windows | `npm run dist:win` | `KevlaEditor-1.0.0-Setup.exe` |
| macOS | `npm run dist:mac` | `KevlaEditor-1.0.0.dmg` |
| Linux | `npm run dist:linux` | `KevlaEditor-1.0.0.AppImage` |

> **Note:** macOS builds require macOS. Linux builds require Linux or Docker.

---

## Custom App Icon

Place your icon at `electron/resources/icon.ico`.

Requirements:
- Format: ICO with embedded sizes (16, 32, 48, 64, 128, 256)
- Source: Start with a 1024×1024 PNG

Generate from PNG:
```bash
npm install -g electron-icon-maker
electron-icon-maker --input=assets/kevla-logo.png --output=electron/resources
```

---

## All npm Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server (browser) |
| `npm run build` | Build web app to `dist/` |
| `npm run preview` | Preview built web app locally |
| `npm run electron` | Launch Electron with built files |
| `npm run electron:dev` | Dev mode: Vite + Electron with hot reload |
| `npm run dist` | Build web app + package installer |
| `npm run dist:win` | Package Windows installer only |
| `npm run dist:mac` | Package macOS DMG only |
| `npm run dist:linux` | Package Linux AppImage + .deb |

---

## Troubleshooting

### "electron" is not recognized
```bash
npm install --save-dev electron@latest
```

### White screen on Electron launch
```bash
npm run build    # Build web app first
npm run electron # Then launch
```

### Assets not loading in Electron
Ensure `vite.config.ts` has `base: './'`.

### NSIS build fails
- Run terminal as Administrator
- Temporarily disable antivirus
- Ensure 2GB+ free disk space
- Delete `release/` folder and retry

### Build errors
```bash
rm -rf node_modules dist release
npm install
npm run build
```
