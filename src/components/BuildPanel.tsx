// ============================================================
// KEVLA ENGINE — Build System Panel
// Browse C++ source files, view code, and export the project
// ============================================================

import { useState, useCallback } from 'react';
import { BUILD_PROJECT, getAllFiles, getTotalFiles, getTotalLines, type SourceFile, type SourceFolder } from '../engine/buildSystem';
import { Icon } from './Icons';

// ---- Language colors ----
const LANG_COLORS: Record<string, string> = {
  cpp: '#519aba',
  cmake: '#064f8c',
  lua: '#000080',
  batch: '#c1f12e',
  shell: '#89e051',
  markdown: '#083fa1',
  glsl: '#5686a5',
};

const LANG_ICONS: Record<string, string> = {
  cpp: 'file', cmake: 'settings', lua: 'script',
  batch: 'terminal', shell: 'terminal', markdown: 'file', glsl: 'file',
};

// ---- Syntax highlighting (basic) ----
function highlightCode(code: string, lang: string): string {
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  if (lang === 'cpp') {
    // Comments
    html = html.replace(/(\/\/.*)/g, '<span class="hl-comment">$1</span>');
    html = html.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="hl-comment">$1</span>');
    // Preprocessor
    html = html.replace(/^(#\w+.*)/gm, '<span class="hl-preproc">$1</span>');
    // Keywords
    html = html.replace(/\b(class|struct|enum|namespace|public|private|protected|virtual|override|const|static|void|bool|int|float|double|unsigned|char|auto|return|if|else|for|while|switch|case|break|continue|new|delete|nullptr|true|false|this|using|template|typename|include|pragma|define|ifdef|ifndef|endif|try|catch|throw|noexcept|explicit|inline|constexpr)\b/g, '<span class="hl-keyword">$1</span>');
    // Types
    html = html.replace(/\b(std::[\w:]+|unique_ptr|shared_ptr|string|vector|unordered_map|unordered_set|make_unique|make_shared|uint32_t|size_t|GLFWwindow|btRigidBody|btVector3|btTransform|btQuaternion|sol::state|sol::function|glm::vec[234]|glm::mat[34]|json|ImVec[24]|ImGuiIO|ImGuiStyle|GLuint|GLenum|GLint|GLfloat)\b/g, '<span class="hl-type">$1</span>');
    // Strings
    html = html.replace(/("(?:[^"\\]|\\.)*")/g, '<span class="hl-string">$1</span>');
    // Numbers
    html = html.replace(/\b(\d+\.?\d*f?)\b/g, '<span class="hl-number">$1</span>');
  } else if (lang === 'cmake') {
    html = html.replace(/(#.*)/g, '<span class="hl-comment">$1</span>');
    html = html.replace(/\b(cmake_minimum_required|project|set|add_library|add_executable|target_link_libraries|target_include_directories|target_compile_definitions|find_package|FetchContent_Declare|FetchContent_MakeAvailable|include|file|message|add_custom_command|set_target_properties|list|if|else|elseif|endif|option)\b/gi, '<span class="hl-keyword">$1</span>');
    html = html.replace(/("(?:[^"\\]|\\.)*")/g, '<span class="hl-string">$1</span>');
    html = html.replace(/\$\{[\w_]+\}/g, '<span class="hl-type">$&</span>');
  } else if (lang === 'lua') {
    html = html.replace(/(--.*)/g, '<span class="hl-comment">$1</span>');
    html = html.replace(/\b(function|end|local|if|then|else|elseif|for|do|while|return|and|or|not|nil|true|false)\b/g, '<span class="hl-keyword">$1</span>');
    html = html.replace(/("(?:[^"\\]|\\.)*")/g, '<span class="hl-string">$1</span>');
    html = html.replace(/\b(\d+\.?\d*)\b/g, '<span class="hl-number">$1</span>');
  } else if (lang === 'markdown') {
    html = html.replace(/^(#{1,6}\s.*)$/gm, '<span class="hl-keyword">$1</span>');
    html = html.replace(/(`[^`]+`)/g, '<span class="hl-string">$1</span>');
    html = html.replace(/(\*\*[^*]+\*\*)/g, '<span class="hl-type">$1</span>');
  } else if (lang === 'batch' || lang === 'shell') {
    html = html.replace(/((?:REM|#).*)/g, '<span class="hl-comment">$1</span>');
    html = html.replace(/\b(echo|set|if|else|goto|exit|cd|mkdir|cmake|start|chmod|sudo|apt-get)\b/gi, '<span class="hl-keyword">$1</span>');
    html = html.replace(/("(?:[^"\\]|\\.)*")/g, '<span class="hl-string">$1</span>');
  }
  return html;
}

// ---- File Tree Component ----
function FileTree({ folder, depth = 0, selectedPath, onSelect }: {
  folder: SourceFolder; depth?: number; selectedPath: string;
  onSelect: (file: SourceFile) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);

  return (
    <div className="bt-folder" style={{ paddingLeft: depth * 12 }}>
      {depth > 0 && (
        <div className="bt-folder-header" onClick={() => setExpanded(!expanded)}>
          <Icon name={expanded ? 'chevronDown' : 'chevronRight'} size={10} />
          <Icon name={expanded ? 'folderOpen' : 'folder'} size={13} color="#e5c07b" />
          <span className="bt-folder-name">{folder.name}</span>
          <span className="bt-folder-count">{getAllFiles(folder).length}</span>
        </div>
      )}
      {(expanded || depth === 0) && (
        <>
          {folder.files.map(file => (
            <div key={file.path}
              className={`bt-file ${selectedPath === file.path ? 'selected' : ''}`}
              style={{ paddingLeft: (depth + 1) * 12 }}
              onClick={() => onSelect(file)}>
              <Icon name={LANG_ICONS[file.lang] || 'file'} size={12}
                color={LANG_COLORS[file.lang] || '#999'} />
              <span className="bt-file-name">{file.name}</span>
              <span className="bt-file-lang" style={{ color: LANG_COLORS[file.lang] }}>
                {file.lang}
              </span>
            </div>
          ))}
          {folder.folders.map(sub => (
            <FileTree key={sub.path} folder={sub} depth={depth + 1}
              selectedPath={selectedPath} onSelect={onSelect} />
          ))}
        </>
      )}
    </div>
  );
}

// ---- Main Build Panel ----
export default function BuildPanel({ onClose }: { onClose: () => void }) {
  const [selectedFile, setSelectedFile] = useState<SourceFile | null>(null);
  const [activeTab, setActiveTab] = useState<'files' | 'instructions' | 'structure'>('files');
  const totalFiles = getTotalFiles();
  const totalLines = getTotalLines();

  const handleExport = useCallback(() => {
    const allFiles = getAllFiles(BUILD_PROJECT);
    let content = '';
    for (const file of allFiles) {
      content += `${'='.repeat(80)}\n`;
      content += `FILE: Kevla/${file.path}\n`;
      content += `${'='.repeat(80)}\n\n`;
      content += file.content;
      content += '\n\n';
    }
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'KevlaEngine_Source.txt';
    a.click(); URL.revokeObjectURL(url);
  }, []);

  const lineCount = selectedFile ? selectedFile.content.split('\n').length : 0;

  return (
    <div className="bt-overlay" onClick={onClose}>
      <div className="bt-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bt-header">
          <div className="bt-header-left">
            <Icon name="diamond" size={14} color="#ff8800" />
            <span className="bt-title">KEVLA Build System</span>
            <span className="bt-subtitle">C++ Native Project → KevlaEditor.exe</span>
          </div>
          <div className="bt-header-right">
            <span className="bt-stat">{totalFiles} files</span>
            <span className="bt-stat">{totalLines.toLocaleString()} lines</span>
            <button className="bt-export-btn" onClick={handleExport}>
              <Icon name="save" size={12} /> Export All
            </button>
            <button className="bt-close" onClick={onClose}>
              <Icon name="x" size={14} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bt-tabs">
          <button className={`bt-tab ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveTab('files')}>
            <Icon name="file" size={12} /> Source Files
          </button>
          <button className={`bt-tab ${activeTab === 'instructions' ? 'active' : ''}`}
            onClick={() => setActiveTab('instructions')}>
            <Icon name="terminal" size={12} /> Build Instructions
          </button>
          <button className={`bt-tab ${activeTab === 'structure' ? 'active' : ''}`}
            onClick={() => setActiveTab('structure')}>
            <Icon name="folder" size={12} /> Architecture
          </button>
        </div>

        {/* Content */}
        <div className="bt-content">
          {activeTab === 'files' && (
            <div className="bt-files-layout">
              {/* File Tree */}
              <div className="bt-sidebar">
                <div className="bt-sidebar-header">
                  <Icon name="folder" size={12} />
                  <span>Kevla/</span>
                </div>
                <div className="bt-tree">
                  <FileTree folder={BUILD_PROJECT} selectedPath={selectedFile?.path || ''}
                    onSelect={setSelectedFile} />
                </div>
              </div>

              {/* Code Viewer */}
              <div className="bt-code-area">
                {selectedFile ? (
                  <>
                    <div className="bt-code-header">
                      <Icon name={LANG_ICONS[selectedFile.lang] || 'file'} size={13}
                        color={LANG_COLORS[selectedFile.lang]} />
                      <span className="bt-code-path">Kevla/{selectedFile.path}</span>
                      <span className="bt-code-lang" style={{ color: LANG_COLORS[selectedFile.lang] }}>
                        {selectedFile.lang.toUpperCase()}
                      </span>
                      <span className="bt-code-lines">{lineCount} lines</span>
                    </div>
                    <div className="bt-code-viewer">
                      <div className="bt-line-numbers">
                        {selectedFile.content.split('\n').map((_, i) => (
                          <div key={i} className="bt-line-num">{i + 1}</div>
                        ))}
                      </div>
                      <pre className="bt-code-content"
                        dangerouslySetInnerHTML={{
                          __html: highlightCode(selectedFile.content, selectedFile.lang)
                        }} />
                    </div>
                  </>
                ) : (
                  <div className="bt-code-empty">
                    <Icon name="file" size={40} color="#333" />
                    <p>Select a file to view its source code</p>
                    <p className="bt-code-hint">← Click any file in the tree</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'instructions' && (
            <div className="bt-instructions">
              <div className="bt-inst-section">
                <h2>🔨 Quick Build (Windows)</h2>
                <pre className="bt-cmd">
{`git clone <repo-url> Kevla
cd Kevla
build_windows.bat`}
                </pre>
                <p>This generates <code>build/bin/Release/KevlaEditor.exe</code></p>
              </div>

              <div className="bt-inst-section">
                <h2>🐧 Quick Build (Linux/macOS)</h2>
                <pre className="bt-cmd">
{`git clone <repo-url> Kevla
cd Kevla
chmod +x build_linux.sh
./build_linux.sh`}
                </pre>
              </div>

              <div className="bt-inst-section">
                <h2>⚙️ Manual Build</h2>
                <pre className="bt-cmd">
{`mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
cmake --build . --config Release --parallel`}
                </pre>
              </div>

              <div className="bt-inst-section">
                <h2>📦 Prerequisites</h2>
                <div className="bt-prereq-grid">
                  <div className="bt-prereq">
                    <h3>Windows</h3>
                    <ul>
                      <li>CMake 3.21+</li>
                      <li>Visual Studio 2022 (C++ workload)</li>
                      <li>Git</li>
                    </ul>
                  </div>
                  <div className="bt-prereq">
                    <h3>Linux</h3>
                    <ul>
                      <li>CMake 3.21+</li>
                      <li>GCC 11+ or Clang 14+</li>
                      <li>libgl1-mesa-dev, libx11-dev</li>
                    </ul>
                  </div>
                  <div className="bt-prereq">
                    <h3>macOS</h3>
                    <ul>
                      <li>CMake 3.21+</li>
                      <li>Xcode Command Line Tools</li>
                      <li>Homebrew (optional)</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bt-inst-section">
                <h2>📚 Dependencies (auto-downloaded)</h2>
                <table className="bt-dep-table">
                  <thead><tr><th>Library</th><th>Version</th><th>Purpose</th></tr></thead>
                  <tbody>
                    <tr><td>GLFW</td><td>3.3.9</td><td>Window & input</td></tr>
                    <tr><td>GLAD</td><td>4.5 Core</td><td>OpenGL loader</td></tr>
                    <tr><td>GLM</td><td>0.9.9.8</td><td>Math library</td></tr>
                    <tr><td>ImGui</td><td>Docking</td><td>Editor UI</td></tr>
                    <tr><td>Bullet</td><td>3.25</td><td>Physics engine</td></tr>
                    <tr><td>Lua</td><td>5.4.6</td><td>Scripting language</td></tr>
                    <tr><td>sol2</td><td>3.3.0</td><td>C++/Lua bindings</td></tr>
                    <tr><td>nlohmann/json</td><td>3.11.3</td><td>JSON serialization</td></tr>
                    <tr><td>stb_image</td><td>latest</td><td>Image loading</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'structure' && (
            <div className="bt-structure">
              <div className="bt-arch-section">
                <h2>🏗 Engine Architecture</h2>
                <div className="bt-arch-grid">
                  {[
                    { name: 'Core', desc: 'Engine lifecycle, frame timing, subsystem management', color: '#e06c75', files: 2 },
                    { name: 'Window', desc: 'GLFW window creation, events, resize handling', color: '#61afef', files: 2 },
                    { name: 'Renderer', desc: 'OpenGL 4.5 PBR pipeline, Cook-Torrance BRDF, shader management', color: '#98c379', files: 6 },
                    { name: 'Camera', desc: 'FPS camera with mouse look, keyboard movement, scroll zoom', color: '#e5c07b', files: 2 },
                    { name: 'Scene', desc: 'Entity Component System, entity management, scene graph', color: '#c678dd', files: 4 },
                    { name: 'Physics', desc: 'Bullet Physics SDK integration, rigidbodies, colliders', color: '#56b6c2', files: 2 },
                    { name: 'Scripting', desc: 'Lua 5.4 VM with sol2 bindings, entity API exposure', color: '#ff9f43', files: 2 },
                    { name: 'Input', desc: 'GLFW keyboard/mouse polling, key press/release detection', color: '#ff6b6b', files: 2 },
                    { name: 'Project', desc: 'JSON project files, scene serialization, asset management', color: '#48dbfb', files: 4 },
                    { name: 'Editor', desc: 'ImGui docking, hierarchy, inspector, viewport, console, assets', color: '#1dd1a1', files: 2 },
                  ].map(mod => (
                    <div key={mod.name} className="bt-arch-card" style={{ borderColor: mod.color }}>
                      <div className="bt-arch-card-header">
                        <span className="bt-arch-dot" style={{ backgroundColor: mod.color }} />
                        <h3>{mod.name}</h3>
                        <span className="bt-arch-count">{mod.files} files</span>
                      </div>
                      <p>{mod.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bt-arch-section">
                <h2>📐 Data Flow</h2>
                <pre className="bt-flow">
{`main.cpp
  └─ Engine::Initialize()
       ├─ Window (GLFW) ──────── creates OpenGL context
       ├─ GLAD ────────────────── loads GL functions
       ├─ Renderer ────────────── PBR shaders + primitive meshes
       ├─ Camera ──────────────── view/projection matrices
       ├─ InputManager ────────── keyboard/mouse polling
       ├─ PhysicsWorld (Bullet) ─ dynamics world + ground plane
       ├─ ScriptSystem (Lua) ──── VM + entity API bindings
       ├─ Scene ───────────────── entity container
       ├─ ProjectManager ──────── .kevla project files
       └─ SceneSerializer ─────── .scene JSON files

  └─ Game Loop
       ├─ BeginFrame() ───── dt calculation, glClear
       ├─ Input::Update() ── poll GLFW keys/mouse
       ├─ Physics::Step() ── Bullet simulation substep
       ├─ Scripts::Update() ─ Lua Update(entity, dt) calls
       ├─ Renderer::Begin() ─ bind shader, set view/proj
       ├─ Renderer::Render() ─ draw each entity (PBR)
       ├─ Editor::Render() ── ImGui docking panels
       └─ EndFrame() ──────── swap buffers`}
                </pre>
              </div>

              <div className="bt-arch-section">
                <h2>📊 Project Stats</h2>
                <div className="bt-stats-grid">
                  <div className="bt-stat-card">
                    <span className="bt-stat-num">{totalFiles}</span>
                    <span className="bt-stat-label">Source Files</span>
                  </div>
                  <div className="bt-stat-card">
                    <span className="bt-stat-num">{totalLines.toLocaleString()}</span>
                    <span className="bt-stat-label">Lines of Code</span>
                  </div>
                  <div className="bt-stat-card">
                    <span className="bt-stat-num">10</span>
                    <span className="bt-stat-label">Subsystems</span>
                  </div>
                  <div className="bt-stat-card">
                    <span className="bt-stat-num">9</span>
                    <span className="bt-stat-label">Dependencies</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
