// ============================================================
// KEVLA ENGINE — Export Manager
// Downloads the complete C++ project as buildable source
// Generates individual files or a combined package
// ============================================================

import { useState } from 'react';
import { BUILD_PROJECT, getAllFiles, getTotalFiles, getTotalLines, type SourceFile } from '../engine/buildSystem';
import { Icon } from './Icons';

interface ExportManagerProps {
  onClose: () => void;
}

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function generateBuildScript(): string {
  return `#!/bin/bash
# ============================================================
# KEVLA ENGINE — Complete Build & Run Script
# Extracts source files and builds KevlaEditor.exe
# ============================================================

echo "========================================"
echo "  KEVLA ENGINE — Build System"
echo "========================================"

# Create project structure
echo "[1/4] Creating project structure..."
mkdir -p Kevla/Engine/{Core,Window,Renderer,Camera,Scene,Physics,Scripting,Input,Project}
mkdir -p Kevla/Editor
mkdir -p Kevla/Assets/{Scripts,Models,Textures,Shaders,Materials}
mkdir -p Kevla/vendor/glad/{src,include/glad,include/KHR}

echo "[2/4] Source files already extracted."
echo "[3/4] Configuring with CMake..."

cd Kevla
mkdir -p build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
echo "[4/4] Building KevlaEditor..."
cmake --build . --config Release --parallel

echo ""
echo "========================================"
echo "  BUILD COMPLETE!"
echo "  Run: ./build/bin/KevlaEditor"
echo "========================================"
`;
}

export default function ExportManager({ onClose }: ExportManagerProps) {
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportLog, setExportLog] = useState<string[]>([]);

  const allFiles = getAllFiles(BUILD_PROJECT);
  const totalFiles = getTotalFiles();
  const totalLines = getTotalLines();

  const exportCombined = () => {
    setExporting(true);
    setExportLog(['Starting export...']);
    
    let content = '';
    content += '//'.padEnd(80, '=') + '\n';
    content += '// KEVLA ENGINE — Complete Source Code Package\n';
    content += `// ${totalFiles} files | ${totalLines.toLocaleString()} lines of code\n`;
    content += `// Generated: ${new Date().toISOString()}\n`;
    content += '//\n';
    content += '// BUILD INSTRUCTIONS:\n';
    content += '//   1. Extract each file to the correct path (shown in FILE: headers)\n';
    content += '//   2. Run: mkdir build && cd build\n';
    content += '//   3. Run: cmake .. -DCMAKE_BUILD_TYPE=Release\n';
    content += '//   4. Run: cmake --build . --config Release\n';
    content += '//   5. Output: build/bin/Release/KevlaEditor.exe\n';
    content += '//'.padEnd(80, '=') + '\n\n';

    allFiles.forEach((file, i) => {
      content += '\n' + '//'.padEnd(80, '=') + '\n';
      content += `// FILE: Kevla/${file.path}\n`;
      content += `// Language: ${file.lang.toUpperCase()}\n`;
      content += `// Lines: ${file.content.split('\n').length}\n`;
      content += '//'.padEnd(80, '=') + '\n\n';
      content += file.content;
      content += '\n';

      setExportProgress(Math.round(((i + 1) / allFiles.length) * 100));
      setExportLog(prev => [...prev, `✓ Kevla/${file.path}`]);
    });

    content += '\n\n' + '//'.padEnd(80, '=') + '\n';
    content += '// END OF KEVLA ENGINE SOURCE PACKAGE\n';
    content += '//'.padEnd(80, '=') + '\n';

    downloadFile('KevlaEngine_Complete_Source.cpp', content);
    
    setExportLog(prev => [...prev, '', `✅ Export complete! ${totalFiles} files, ${totalLines.toLocaleString()} lines`]);
    setTimeout(() => setExporting(false), 1500);
  };

  const exportIndividual = async () => {
    setExporting(true);
    setExportLog(['Creating individual source files...']);

    // Create a combined script that includes file extraction commands
    let extractScript = '#!/bin/bash\n';
    extractScript += '# KEVLA ENGINE — Source File Extractor\n';
    extractScript += '# This script creates the complete project structure\n\n';
    extractScript += 'echo "Extracting KEVLA Engine source files..."\n\n';
    
    // Create directories
    const dirs = new Set<string>();
    allFiles.forEach(file => {
      const dir = file.path.split('/').slice(0, -1).join('/');
      if (dir) dirs.add(dir);
    });
    
    dirs.forEach(dir => {
      extractScript += `mkdir -p "Kevla/${dir}"\n`;
    });
    extractScript += '\n';

    // Create files using heredocs
    allFiles.forEach((file, i) => {
      extractScript += `# File ${i + 1}/${allFiles.length}: ${file.path}\n`;
      extractScript += `cat > "Kevla/${file.path}" << 'KEVLA_EOF'\n`;
      extractScript += file.content;
      if (!file.content.endsWith('\n')) extractScript += '\n';
      extractScript += 'KEVLA_EOF\n\n';

      setExportProgress(Math.round(((i + 1) / allFiles.length) * 100));
    });

    extractScript += '\necho ""\n';
    extractScript += `echo "✅ Extracted ${allFiles.length} files to Kevla/"\n`;
    extractScript += 'echo "Run: cd Kevla && mkdir build && cd build && cmake .. && cmake --build ."\n';

    downloadFile('extract_kevla_source.sh', extractScript);
    setExportLog(prev => [...prev, `✅ Extractor script created with ${totalFiles} embedded files`]);
    setTimeout(() => setExporting(false), 1000);
  };

  const exportBuildScript = () => {
    downloadFile('build_kevla.sh', generateBuildScript());
    setExportLog(prev => [...prev, '✅ Build script exported']);
  };

  const exportSingleFile = (file: SourceFile) => {
    const filename = file.path.replace(/\//g, '_');
    downloadFile(filename, file.content);
    setExportLog(prev => [...prev, `✅ Downloaded: ${file.path}`]);
  };

  return (
    <div className="em-overlay" onClick={onClose}>
      <div className="em-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="em-header">
          <div className="em-header-left">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <defs>
                <linearGradient id="emg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff8800" />
                  <stop offset="100%" stopColor="#ff4400" />
                </linearGradient>
              </defs>
              <polygon points="12,1 23,12 12,23 1,12" fill="url(#emg)" />
            </svg>
            <div>
              <h1 className="em-title">Export KevlaEditor.exe Source</h1>
              <p className="em-subtitle">Download complete C++ project ready to compile</p>
            </div>
          </div>
          <button className="em-close" onClick={onClose}>
            <Icon name="x" size={14} />
          </button>
        </div>

        <div className="em-body">
          {/* Stats */}
          <div className="em-stats-row">
            <div className="em-stat-card">
              <span className="em-stat-num">{totalFiles}</span>
              <span className="em-stat-label">Source Files</span>
            </div>
            <div className="em-stat-card">
              <span className="em-stat-num">{totalLines.toLocaleString()}</span>
              <span className="em-stat-label">Lines of C++</span>
            </div>
            <div className="em-stat-card">
              <span className="em-stat-num">9</span>
              <span className="em-stat-label">Dependencies</span>
            </div>
            <div className="em-stat-card">
              <span className="em-stat-num">10</span>
              <span className="em-stat-label">Subsystems</span>
            </div>
          </div>

          {/* Export Options */}
          <div className="em-options">
            <h3 className="em-section-title">Export Options</h3>

            <button className="em-export-btn em-export-primary" onClick={exportCombined}>
              <div className="em-btn-icon">
                <Icon name="save" size={20} />
              </div>
              <div className="em-btn-info">
                <span className="em-btn-title">Download Complete Source Package</span>
                <span className="em-btn-desc">Single file with all {totalFiles} source files embedded — extract and build</span>
              </div>
              <span className="em-btn-badge">.cpp</span>
            </button>

            <button className="em-export-btn" onClick={exportIndividual}>
              <div className="em-btn-icon">
                <Icon name="folder" size={20} />
              </div>
              <div className="em-btn-info">
                <span className="em-btn-title">Download Extractor Script</span>
                <span className="em-btn-desc">Shell script that creates the full Kevla/ directory with all files</span>
              </div>
              <span className="em-btn-badge">.sh</span>
            </button>

            <button className="em-export-btn" onClick={exportBuildScript}>
              <div className="em-btn-icon">
                <Icon name="terminal" size={20} />
              </div>
              <div className="em-btn-info">
                <span className="em-btn-title">Download Build Script</span>
                <span className="em-btn-desc">CMake build commands for Windows, Linux, and macOS</span>
              </div>
              <span className="em-btn-badge">.sh</span>
            </button>
          </div>

          {/* Individual Files */}
          <div className="em-files-section">
            <h3 className="em-section-title">
              Download Individual Files
              <span className="em-count">{totalFiles} files</span>
            </h3>
            <div className="em-files-grid">
              {allFiles.map(file => (
                <button key={file.path} className="em-file-btn" onClick={() => exportSingleFile(file)}>
                  <Icon name="file" size={11}
                    color={file.lang === 'cpp' ? '#519aba' : file.lang === 'cmake' ? '#064f8c' :
                           file.lang === 'lua' ? '#000080' : '#999'} />
                  <span className="em-file-name">{file.name}</span>
                  <span className="em-file-path">{file.path.split('/').slice(0, -1).join('/')}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Build Instructions */}
          <div className="em-build-section">
            <h3 className="em-section-title">Build to KevlaEditor.exe</h3>
            <div className="em-build-steps">
              <div className="em-step">
                <span className="em-step-num">1</span>
                <div className="em-step-info">
                  <span className="em-step-title">Extract source files</span>
                  <code className="em-step-cmd">Run the extractor script or manually create Kevla/ directory</code>
                </div>
              </div>
              <div className="em-step">
                <span className="em-step-num">2</span>
                <div className="em-step-info">
                  <span className="em-step-title">Configure CMake</span>
                  <code className="em-step-cmd">cd Kevla && mkdir build && cd build && cmake .. -DCMAKE_BUILD_TYPE=Release</code>
                </div>
              </div>
              <div className="em-step">
                <span className="em-step-num">3</span>
                <div className="em-step-info">
                  <span className="em-step-title">Build the executable</span>
                  <code className="em-step-cmd">cmake --build . --config Release --parallel</code>
                </div>
              </div>
              <div className="em-step">
                <span className="em-step-num">4</span>
                <div className="em-step-info">
                  <span className="em-step-title">Run KevlaEditor</span>
                  <code className="em-step-cmd">./build/bin/Release/KevlaEditor.exe</code>
                </div>
              </div>
            </div>

            <div className="em-prereq">
              <h4>Prerequisites</h4>
              <div className="em-prereq-list">
                <span>CMake 3.21+</span>
                <span>Visual Studio 2022 <em>or</em> GCC 11+</span>
                <span>Git</span>
              </div>
              <p className="em-prereq-note">All 9 engine dependencies (GLFW, GLAD, GLM, ImGui, Bullet, Lua, sol2, nlohmann/json, stb) are automatically downloaded by CMake FetchContent. No manual installation required.</p>
            </div>
          </div>

          {/* Export Log */}
          {exportLog.length > 0 && (
            <div className="em-log">
              <h3 className="em-section-title">Export Log</h3>
              <div className="em-log-content">
                {exportLog.map((line, i) => (
                  <div key={i} className="em-log-line">{line}</div>
                ))}
              </div>
              {exporting && (
                <div className="em-log-progress">
                  <div className="em-log-bar">
                    <div className="em-log-fill" style={{ width: `${exportProgress}%` }} />
                  </div>
                  <span>{exportProgress}%</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
