# KEVLA Editor — Electron Resources

Place the following icon files here for the installer and application.

## Required Files

### `icon.ico` — Windows
- 256×256 pixels minimum
- ICO format with multiple sizes (16, 32, 48, 64, 128, 256)
- Used for: .exe icon, installer icon, taskbar, desktop shortcut

### `icon.icns` — macOS
- 512×512 or 1024×1024 pixels
- ICNS format
- Used for: .app icon, dock icon

### `icons/` folder — Linux
- PNG files: `16x16.png`, `32x32.png`, `48x48.png`, `64x64.png`, `128x128.png`, `256x256.png`, `512x512.png`

## Generate Icons from Logo

```bash
# Install icon generator
npm install -g electron-icon-maker

# Generate all formats from the KEVLA logo
electron-icon-maker --input=../../assets/kevla-logo.png --output=.
```

## Optional Files

### `installerSidebar.bmp` — Windows NSIS
- 164×314 pixels, 24-bit BMP format
- Shown on the left side of the installer wizard
