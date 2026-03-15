// ============================================================
// KEVLA ENGINE — C++ Build System
// Complete native project that compiles to KevlaEditor.exe
// All source files, CMake config, shaders, and build scripts
// ============================================================

export interface SourceFile {
  name: string;
  path: string;
  lang: string;
  content: string;
}

export interface SourceFolder {
  name: string;
  path: string;
  files: SourceFile[];
  folders: SourceFolder[];
}

// ============================================================
// ROOT FILES
// ============================================================

const ROOT_CMAKE = `# ============================================================
# KEVLA ENGINE — Root CMakeLists.txt
# Production-level 3D game engine build system
# Output: KevlaEditor.exe
# ============================================================
cmake_minimum_required(VERSION 3.21)
project(KevlaEngine VERSION 1.0.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Output directories
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY \${CMAKE_BINARY_DIR}/bin)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY \${CMAKE_BINARY_DIR}/lib)
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY \${CMAKE_BINARY_DIR}/lib)

# ---- Fetch Dependencies via FetchContent ----
include(FetchContent)

# GLFW — Windowing
FetchContent_Declare(glfw
  GIT_REPOSITORY https://github.com/glfw/glfw.git
  GIT_TAG        3.3.9)
set(GLFW_BUILD_DOCS OFF CACHE BOOL "" FORCE)
set(GLFW_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(GLFW_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(glfw)

# GLM — Math library (header-only)
FetchContent_Declare(glm
  GIT_REPOSITORY https://github.com/g-truc/glm.git
  GIT_TAG        0.9.9.8)
FetchContent_MakeAvailable(glm)

# nlohmann/json — JSON serialization (header-only)
FetchContent_Declare(json
  GIT_REPOSITORY https://github.com/nlohmann/json.git
  GIT_TAG        v3.11.3)
FetchContent_MakeAvailable(json)

# Bullet Physics
FetchContent_Declare(bullet3
  GIT_REPOSITORY https://github.com/bulletphysics/bullet3.git
  GIT_TAG        3.25)
set(BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)
set(BUILD_CPU_DEMOS OFF CACHE BOOL "" FORCE)
set(BUILD_BULLET2_DEMOS OFF CACHE BOOL "" FORCE)
set(BUILD_EXTRAS OFF CACHE BOOL "" FORCE)
set(BUILD_UNIT_TESTS OFF CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(bullet3)

# Lua 5.4 (we compile from source)
FetchContent_Declare(lua
  URL https://www.lua.org/ftp/lua-5.4.6.tar.gz)
FetchContent_MakeAvailable(lua)

# Build Lua as a static library
file(GLOB LUA_SOURCES \${lua_SOURCE_DIR}/src/*.c)
list(REMOVE_ITEM LUA_SOURCES
  \${lua_SOURCE_DIR}/src/lua.c
  \${lua_SOURCE_DIR}/src/luac.c)
add_library(lua_static STATIC \${LUA_SOURCES})
target_include_directories(lua_static PUBLIC \${lua_SOURCE_DIR}/src)
if(UNIX)
  target_compile_definitions(lua_static PUBLIC LUA_USE_POSIX)
endif()

# sol2 — C++ Lua bindings (header-only)
FetchContent_Declare(sol2
  GIT_REPOSITORY https://github.com/ThePhD/sol2.git
  GIT_TAG        v3.3.0)
FetchContent_MakeAvailable(sol2)

# stb — Image loading (header-only)
FetchContent_Declare(stb
  GIT_REPOSITORY https://github.com/nothings/stb.git
  GIT_TAG        master)
FetchContent_MakeAvailable(stb)

# ---- GLAD (bundled in project) ----
add_library(glad STATIC
  \${CMAKE_SOURCE_DIR}/vendor/glad/src/glad.c)
target_include_directories(glad PUBLIC
  \${CMAKE_SOURCE_DIR}/vendor/glad/include)

# ---- ImGui (docking branch, bundled) ----
FetchContent_Declare(imgui
  GIT_REPOSITORY https://github.com/ocornut/imgui.git
  GIT_TAG        docking)
FetchContent_MakeAvailable(imgui)

add_library(imgui STATIC
  \${imgui_SOURCE_DIR}/imgui.cpp
  \${imgui_SOURCE_DIR}/imgui_draw.cpp
  \${imgui_SOURCE_DIR}/imgui_tables.cpp
  \${imgui_SOURCE_DIR}/imgui_widgets.cpp
  \${imgui_SOURCE_DIR}/imgui_demo.cpp
  \${imgui_SOURCE_DIR}/backends/imgui_impl_glfw.cpp
  \${imgui_SOURCE_DIR}/backends/imgui_impl_opengl3.cpp)
target_include_directories(imgui PUBLIC
  \${imgui_SOURCE_DIR}
  \${imgui_SOURCE_DIR}/backends)
target_link_libraries(imgui PUBLIC glfw glad)
target_compile_definitions(imgui PUBLIC
  IMGUI_IMPL_OPENGL_LOADER_GLAD)

# ---- Engine Library ----
file(GLOB_RECURSE ENGINE_SOURCES
  Engine/Core/*.cpp
  Engine/Window/*.cpp
  Engine/Renderer/*.cpp
  Engine/Camera/*.cpp
  Engine/Scene/*.cpp
  Engine/Physics/*.cpp
  Engine/Scripting/*.cpp
  Engine/Input/*.cpp
  Engine/Project/*.cpp)
file(GLOB_RECURSE ENGINE_HEADERS
  Engine/**/*.h)

add_library(KevlaEngine STATIC \${ENGINE_SOURCES} \${ENGINE_HEADERS})
target_include_directories(KevlaEngine PUBLIC
  \${CMAKE_SOURCE_DIR}
  \${CMAKE_SOURCE_DIR}/Engine
  \${stb_SOURCE_DIR}
  \${bullet3_SOURCE_DIR}/src)
target_link_libraries(KevlaEngine PUBLIC
  glad glfw glm::glm imgui lua_static sol2
  nlohmann_json::nlohmann_json
  BulletDynamics BulletCollision LinearMath)
target_compile_definitions(KevlaEngine PUBLIC
  KEVLA_VERSION="1.0.0"
  KEVLA_ASSETS_DIR="\${CMAKE_SOURCE_DIR}/Assets")

# ---- Editor Library ----
file(GLOB_RECURSE EDITOR_SOURCES Editor/*.cpp)
file(GLOB_RECURSE EDITOR_HEADERS Editor/*.h)

add_library(KevlaEditor_lib STATIC \${EDITOR_SOURCES} \${EDITOR_HEADERS})
target_include_directories(KevlaEditor_lib PUBLIC \${CMAKE_SOURCE_DIR})
target_link_libraries(KevlaEditor_lib PUBLIC KevlaEngine)

# ---- Executable ----
add_executable(KevlaEditor main.cpp)
target_link_libraries(KevlaEditor PRIVATE KevlaEditor_lib KevlaEngine)

# Platform-specific
if(WIN32)
  target_link_libraries(KevlaEditor PRIVATE opengl32)
  set_target_properties(KevlaEditor PROPERTIES
    WIN32_EXECUTABLE $<CONFIG:Release>)
elseif(APPLE)
  find_package(OpenGL REQUIRED)
  target_link_libraries(KevlaEditor PRIVATE OpenGL::GL)
else()
  find_package(OpenGL REQUIRED)
  target_link_libraries(KevlaEditor PRIVATE OpenGL::GL dl pthread)
endif()

# Copy assets to build directory
add_custom_command(TARGET KevlaEditor POST_BUILD
  COMMAND \${CMAKE_COMMAND} -E copy_directory
    \${CMAKE_SOURCE_DIR}/Assets
    $<TARGET_FILE_DIR:KevlaEditor>/Assets)

message(STATUS "")
message(STATUS "========================================")
message(STATUS "  KEVLA ENGINE v\${PROJECT_VERSION}")
message(STATUS "  Build Type: \${CMAKE_BUILD_TYPE}")
message(STATUS "  Output:     KevlaEditor.exe")
message(STATUS "========================================")
message(STATUS "")
`;

const MAIN_CPP = `// ============================================================
// KEVLA ENGINE — Entry Point
// Creates the editor application and runs the main loop
// ============================================================

#include "Engine/Core/Engine.h"
#include "Editor/Editor.h"
#include <iostream>

int main(int argc, char** argv) {
    (void)argc; (void)argv;

    std::cout << "========================================" << std::endl;
    std::cout << "  KEVLA ENGINE v" << KEVLA_VERSION         << std::endl;
    std::cout << "  Starting KevlaEditor..."                 << std::endl;
    std::cout << "========================================" << std::endl;

    try {
        // Initialize engine subsystems
        Kevla::Engine engine;
        if (!engine.Initialize("KEVLA Editor", 1920, 1080)) {
            std::cerr << "[FATAL] Engine initialization failed!" << std::endl;
            return -1;
        }

        // Initialize editor UI
        Kevla::Editor editor(engine);
        if (!editor.Initialize()) {
            std::cerr << "[FATAL] Editor initialization failed!" << std::endl;
            return -1;
        }

        // Create default scene with a cube
        auto& scene = engine.GetActiveScene();
        auto cube = scene.CreateEntity("Cube");
        cube->AddMeshRenderer(Kevla::MeshType::Cube);
        cube->GetTransform().position = {0.0f, 0.5f, 0.0f};

        auto ground = scene.CreateEntity("Ground");
        ground->AddMeshRenderer(Kevla::MeshType::Cube);
        ground->GetTransform().position = {0.0f, -0.05f, 0.0f};
        ground->GetTransform().scale = {20.0f, 0.1f, 20.0f};
        ground->AddRigidbody(0.0f); // Static body

        // Main loop
        while (!engine.ShouldClose()) {
            engine.BeginFrame();

            // Update engine systems
            float dt = engine.GetDeltaTime();
            engine.GetInputManager().Update();
            engine.GetPhysicsWorld().StepSimulation(dt);
            engine.GetScriptSystem().Update(dt);

            // Render
            engine.GetRenderer().BeginScene(engine.GetCamera());
            engine.GetRenderer().RenderScene(scene);
            engine.GetRenderer().EndScene();

            // Editor UI (ImGui)
            editor.BeginFrame();
            editor.RenderPanels();
            editor.EndFrame();

            engine.EndFrame();
        }

        // Cleanup
        editor.Shutdown();
        engine.Shutdown();

    } catch (const std::exception& e) {
        std::cerr << "[FATAL] " << e.what() << std::endl;
        return -1;
    }

    std::cout << "KEVLA Editor closed cleanly." << std::endl;
    return 0;
}
`;

// ============================================================
// ENGINE/CORE
// ============================================================

const ENGINE_H = `#pragma once
// ============================================================
// KEVLA ENGINE — Core Engine Class
// Owns all subsystems: Window, Renderer, Physics, Scripting
// ============================================================

#include "Engine/Window/Window.h"
#include "Engine/Renderer/Renderer.h"
#include "Engine/Renderer/Shader.h"
#include "Engine/Camera/Camera.h"
#include "Engine/Scene/Scene.h"
#include "Engine/Physics/PhysicsWorld.h"
#include "Engine/Scripting/ScriptSystem.h"
#include "Engine/Input/InputManager.h"
#include "Engine/Project/ProjectManager.h"
#include "Engine/Project/SceneSerializer.h"

#include <memory>
#include <string>
#include <chrono>

namespace Kevla {

class Engine {
public:
    Engine();
    ~Engine();

    // Lifecycle
    bool Initialize(const std::string& title, int width, int height);
    void Shutdown();
    bool ShouldClose() const;

    // Frame management
    void BeginFrame();
    void EndFrame();
    float GetDeltaTime() const { return m_DeltaTime; }
    float GetTime() const { return m_TotalTime; }
    int GetFPS() const { return m_FPS; }

    // Subsystem access
    Window& GetWindow() { return *m_Window; }
    Renderer& GetRenderer() { return *m_Renderer; }
    Camera& GetCamera() { return *m_Camera; }
    Scene& GetActiveScene() { return *m_ActiveScene; }
    PhysicsWorld& GetPhysicsWorld() { return *m_PhysicsWorld; }
    ScriptSystem& GetScriptSystem() { return *m_ScriptSystem; }
    InputManager& GetInputManager() { return *m_InputManager; }
    ProjectManager& GetProjectManager() { return *m_ProjectManager; }
    SceneSerializer& GetSceneSerializer() { return *m_SceneSerializer; }

    // Scene management
    void NewScene(const std::string& name = "Untitled");
    void LoadScene(const std::string& path);
    void SaveScene(const std::string& path);

private:
    // Subsystems (order matters for destruction)
    std::unique_ptr<Window>          m_Window;
    std::unique_ptr<Renderer>        m_Renderer;
    std::unique_ptr<Camera>          m_Camera;
    std::unique_ptr<Scene>           m_ActiveScene;
    std::unique_ptr<PhysicsWorld>    m_PhysicsWorld;
    std::unique_ptr<ScriptSystem>    m_ScriptSystem;
    std::unique_ptr<InputManager>    m_InputManager;
    std::unique_ptr<ProjectManager>  m_ProjectManager;
    std::unique_ptr<SceneSerializer> m_SceneSerializer;

    // Timing
    float m_DeltaTime = 0.0f;
    float m_TotalTime = 0.0f;
    int   m_FPS = 0;
    int   m_FrameCount = 0;
    float m_FPSTimer = 0.0f;
    std::chrono::high_resolution_clock::time_point m_LastFrameTime;

    bool m_Initialized = false;
};

} // namespace Kevla
`;

const ENGINE_CPP = `#include "Engine/Core/Engine.h"
#include <glad/glad.h>
#include <GLFW/glfw3.h>
#include <iostream>

namespace Kevla {

Engine::Engine() = default;
Engine::~Engine() { if (m_Initialized) Shutdown(); }

bool Engine::Initialize(const std::string& title, int width, int height) {
    std::cout << "[Engine] Initializing KEVLA Engine v" << KEVLA_VERSION << std::endl;

    // 1. Window (initializes GLFW + OpenGL context)
    m_Window = std::make_unique<Window>();
    if (!m_Window->Create(title, width, height)) {
        std::cerr << "[Engine] Failed to create window!" << std::endl;
        return false;
    }

    // 2. Load OpenGL functions via GLAD
    if (!gladLoadGLLoader((GLADloadproc)glfwGetProcAddress)) {
        std::cerr << "[Engine] Failed to initialize GLAD!" << std::endl;
        return false;
    }

    std::cout << "[Engine] OpenGL " << glGetString(GL_VERSION) << std::endl;
    std::cout << "[Engine] GPU: " << glGetString(GL_RENDERER) << std::endl;

    // 3. Configure OpenGL
    glEnable(GL_DEPTH_TEST);
    glEnable(GL_CULL_FACE);
    glCullFace(GL_BACK);
    glEnable(GL_BLEND);
    glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
    glClearColor(0.1f, 0.1f, 0.12f, 1.0f);

    // 4. Renderer
    m_Renderer = std::make_unique<Renderer>();
    if (!m_Renderer->Initialize()) {
        std::cerr << "[Engine] Failed to initialize renderer!" << std::endl;
        return false;
    }

    // 5. Camera
    m_Camera = std::make_unique<Camera>(60.0f, (float)width / height);
    m_Camera->SetPosition({10.0f, 8.0f, 10.0f});
    m_Camera->LookAt({0.0f, 0.0f, 0.0f});

    // 6. Input
    m_InputManager = std::make_unique<InputManager>(m_Window->GetNativeHandle());

    // 7. Physics
    m_PhysicsWorld = std::make_unique<PhysicsWorld>();
    m_PhysicsWorld->Initialize({0.0f, -9.81f, 0.0f});

    // 8. Scripting
    m_ScriptSystem = std::make_unique<ScriptSystem>();
    m_ScriptSystem->Initialize();

    // 9. Scene
    m_ActiveScene = std::make_unique<Scene>("Default Scene");

    // 10. Project
    m_ProjectManager = std::make_unique<ProjectManager>();
    m_SceneSerializer = std::make_unique<SceneSerializer>();

    m_LastFrameTime = std::chrono::high_resolution_clock::now();
    m_Initialized = true;

    std::cout << "[Engine] All subsystems initialized." << std::endl;
    return true;
}

void Engine::Shutdown() {
    std::cout << "[Engine] Shutting down..." << std::endl;
    m_ScriptSystem->Shutdown();
    m_PhysicsWorld->Shutdown();
    m_Renderer->Shutdown();
    m_Window->Destroy();
    m_Initialized = false;
}

bool Engine::ShouldClose() const {
    return m_Window->ShouldClose();
}

void Engine::BeginFrame() {
    // Calculate delta time
    auto now = std::chrono::high_resolution_clock::now();
    m_DeltaTime = std::chrono::duration<float>(now - m_LastFrameTime).count();
    m_DeltaTime = std::min(m_DeltaTime, 0.05f); // Clamp to avoid spiral
    m_LastFrameTime = now;
    m_TotalTime += m_DeltaTime;

    // FPS counter
    m_FrameCount++;
    m_FPSTimer += m_DeltaTime;
    if (m_FPSTimer >= 1.0f) {
        m_FPS = m_FrameCount;
        m_FrameCount = 0;
        m_FPSTimer = 0.0f;
    }

    m_Window->PollEvents();
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
}

void Engine::EndFrame() {
    m_Window->SwapBuffers();
}

void Engine::NewScene(const std::string& name) {
    m_ActiveScene = std::make_unique<Scene>(name);
    m_PhysicsWorld->Clear();
}

void Engine::LoadScene(const std::string& path) {
    auto scene = m_SceneSerializer->Deserialize(path);
    if (scene) {
        m_ActiveScene = std::move(scene);
        std::cout << "[Engine] Scene loaded: " << path << std::endl;
    }
}

void Engine::SaveScene(const std::string& path) {
    m_SceneSerializer->Serialize(*m_ActiveScene, path);
    std::cout << "[Engine] Scene saved: " << path << std::endl;
}

} // namespace Kevla
`;

// ============================================================
// ENGINE/WINDOW
// ============================================================

const WINDOW_H = `#pragma once
// ============================================================
// KEVLA ENGINE — Window (GLFW wrapper)
// ============================================================

#include <string>

struct GLFWwindow;

namespace Kevla {

class Window {
public:
    Window() = default;
    ~Window();

    bool Create(const std::string& title, int width, int height);
    void Destroy();

    bool ShouldClose() const;
    void PollEvents();
    void SwapBuffers();

    int GetWidth() const { return m_Width; }
    int GetHeight() const { return m_Height; }
    float GetAspect() const { return (float)m_Width / m_Height; }
    GLFWwindow* GetNativeHandle() const { return m_Handle; }

    void SetTitle(const std::string& title);

private:
    GLFWwindow* m_Handle = nullptr;
    int m_Width = 1280;
    int m_Height = 720;

    static void FramebufferSizeCallback(GLFWwindow* window, int w, int h);
};

} // namespace Kevla
`;

const WINDOW_CPP = `#include "Engine/Window/Window.h"
#include <GLFW/glfw3.h>
#include <glad/glad.h>
#include <iostream>

namespace Kevla {

Window::~Window() { if (m_Handle) Destroy(); }

bool Window::Create(const std::string& title, int width, int height) {
    m_Width = width;
    m_Height = height;

    if (!glfwInit()) {
        std::cerr << "[Window] GLFW init failed!" << std::endl;
        return false;
    }

    // Request OpenGL 4.5 Core
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 4);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 5);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
    glfwWindowHint(GLFW_SAMPLES, 4); // MSAA
    glfwWindowHint(GLFW_MAXIMIZED, GLFW_TRUE);

#ifdef __APPLE__
    glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GL_TRUE);
#endif

    m_Handle = glfwCreateWindow(width, height, title.c_str(), nullptr, nullptr);
    if (!m_Handle) {
        std::cerr << "[Window] Failed to create GLFW window!" << std::endl;
        glfwTerminate();
        return false;
    }

    glfwMakeContextCurrent(m_Handle);
    glfwSwapInterval(1); // VSync
    glfwSetWindowUserPointer(m_Handle, this);
    glfwSetFramebufferSizeCallback(m_Handle, FramebufferSizeCallback);

    // Update actual size (may differ from requested due to maximize)
    glfwGetFramebufferSize(m_Handle, &m_Width, &m_Height);

    std::cout << "[Window] Created " << m_Width << "x" << m_Height << std::endl;
    return true;
}

void Window::Destroy() {
    if (m_Handle) {
        glfwDestroyWindow(m_Handle);
        m_Handle = nullptr;
    }
    glfwTerminate();
}

bool Window::ShouldClose() const {
    return glfwWindowShouldClose(m_Handle);
}

void Window::PollEvents() { glfwPollEvents(); }
void Window::SwapBuffers() { glfwSwapBuffers(m_Handle); }

void Window::SetTitle(const std::string& title) {
    glfwSetWindowTitle(m_Handle, title.c_str());
}

void Window::FramebufferSizeCallback(GLFWwindow* window, int w, int h) {
    auto* self = static_cast<Window*>(glfwGetWindowUserPointer(window));
    self->m_Width = w;
    self->m_Height = h;
    glViewport(0, 0, w, h);
}

} // namespace Kevla
`;

// ============================================================
// ENGINE/RENDERER
// ============================================================

const SHADER_H = `#pragma once
// ============================================================
// KEVLA ENGINE — Shader (GLSL compilation + uniform management)
// ============================================================

#include <string>
#include <unordered_map>
#include <glm/glm.hpp>

namespace Kevla {

class Shader {
public:
    Shader() = default;
    ~Shader();

    bool LoadFromFiles(const std::string& vertPath, const std::string& fragPath);
    bool LoadFromSource(const std::string& vertSrc, const std::string& fragSrc);

    void Bind() const;
    void Unbind() const;

    // Uniform setters
    void SetInt(const std::string& name, int value);
    void SetFloat(const std::string& name, float value);
    void SetVec2(const std::string& name, const glm::vec2& v);
    void SetVec3(const std::string& name, const glm::vec3& v);
    void SetVec4(const std::string& name, const glm::vec4& v);
    void SetMat3(const std::string& name, const glm::mat3& m);
    void SetMat4(const std::string& name, const glm::mat4& m);
    void SetBool(const std::string& name, bool value);

    unsigned int GetID() const { return m_ID; }

private:
    unsigned int m_ID = 0;
    mutable std::unordered_map<std::string, int> m_UniformCache;

    int GetUniformLocation(const std::string& name) const;
    unsigned int CompileShader(unsigned int type, const std::string& source);
    bool LinkProgram(unsigned int vertShader, unsigned int fragShader);
};

} // namespace Kevla
`;

const SHADER_CPP = `#include "Engine/Renderer/Shader.h"
#include <glad/glad.h>
#include <glm/gtc/type_ptr.hpp>
#include <fstream>
#include <sstream>
#include <iostream>

namespace Kevla {

Shader::~Shader() { if (m_ID) glDeleteProgram(m_ID); }

bool Shader::LoadFromFiles(const std::string& vertPath, const std::string& fragPath) {
    auto readFile = [](const std::string& path) -> std::string {
        std::ifstream file(path);
        if (!file.is_open()) {
            std::cerr << "[Shader] Cannot open: " << path << std::endl;
            return "";
        }
        std::stringstream ss;
        ss << file.rdbuf();
        return ss.str();
    };
    return LoadFromSource(readFile(vertPath), readFile(fragPath));
}

bool Shader::LoadFromSource(const std::string& vertSrc, const std::string& fragSrc) {
    if (vertSrc.empty() || fragSrc.empty()) return false;

    unsigned int vert = CompileShader(GL_VERTEX_SHADER, vertSrc);
    unsigned int frag = CompileShader(GL_FRAGMENT_SHADER, fragSrc);
    if (!vert || !frag) return false;

    bool ok = LinkProgram(vert, frag);
    glDeleteShader(vert);
    glDeleteShader(frag);
    return ok;
}

void Shader::Bind() const { glUseProgram(m_ID); }
void Shader::Unbind() const { glUseProgram(0); }

int Shader::GetUniformLocation(const std::string& name) const {
    auto it = m_UniformCache.find(name);
    if (it != m_UniformCache.end()) return it->second;
    int loc = glGetUniformLocation(m_ID, name.c_str());
    m_UniformCache[name] = loc;
    return loc;
}

void Shader::SetInt(const std::string& n, int v)                  { glUniform1i(GetUniformLocation(n), v); }
void Shader::SetFloat(const std::string& n, float v)              { glUniform1f(GetUniformLocation(n), v); }
void Shader::SetBool(const std::string& n, bool v)                { glUniform1i(GetUniformLocation(n), (int)v); }
void Shader::SetVec2(const std::string& n, const glm::vec2& v)    { glUniform2fv(GetUniformLocation(n), 1, glm::value_ptr(v)); }
void Shader::SetVec3(const std::string& n, const glm::vec3& v)    { glUniform3fv(GetUniformLocation(n), 1, glm::value_ptr(v)); }
void Shader::SetVec4(const std::string& n, const glm::vec4& v)    { glUniform4fv(GetUniformLocation(n), 1, glm::value_ptr(v)); }
void Shader::SetMat3(const std::string& n, const glm::mat3& m)    { glUniformMatrix3fv(GetUniformLocation(n), 1, GL_FALSE, glm::value_ptr(m)); }
void Shader::SetMat4(const std::string& n, const glm::mat4& m)    { glUniformMatrix4fv(GetUniformLocation(n), 1, GL_FALSE, glm::value_ptr(m)); }

unsigned int Shader::CompileShader(unsigned int type, const std::string& source) {
    unsigned int id = glCreateShader(type);
    const char* src = source.c_str();
    glShaderSource(id, 1, &src, nullptr);
    glCompileShader(id);

    int success;
    glGetShaderiv(id, GL_COMPILE_STATUS, &success);
    if (!success) {
        char log[512];
        glGetShaderInfoLog(id, 512, nullptr, log);
        std::cerr << "[Shader] Compile error: " << log << std::endl;
        glDeleteShader(id);
        return 0;
    }
    return id;
}

bool Shader::LinkProgram(unsigned int vert, unsigned int frag) {
    m_ID = glCreateProgram();
    glAttachShader(m_ID, vert);
    glAttachShader(m_ID, frag);
    glLinkProgram(m_ID);

    int success;
    glGetProgramiv(m_ID, GL_LINK_STATUS, &success);
    if (!success) {
        char log[512];
        glGetProgramInfoLog(m_ID, 512, nullptr, log);
        std::cerr << "[Shader] Link error: " << log << std::endl;
        glDeleteProgram(m_ID);
        m_ID = 0;
        return false;
    }
    return true;
}

} // namespace Kevla
`;

const MESH_H = `#pragma once
// ============================================================
// KEVLA ENGINE — Mesh (GPU geometry: VAO/VBO/EBO)
// ============================================================

#include <glm/glm.hpp>
#include <vector>

namespace Kevla {

struct Vertex {
    glm::vec3 position;
    glm::vec3 normal;
    glm::vec2 texCoords;
};

class Mesh {
public:
    Mesh() = default;
    ~Mesh();

    // Move-only (RAII GPU resources)
    Mesh(Mesh&& other) noexcept;
    Mesh& operator=(Mesh&& other) noexcept;
    Mesh(const Mesh&) = delete;
    Mesh& operator=(const Mesh&) = delete;

    void Create(const std::vector<Vertex>& vertices,
                const std::vector<unsigned int>& indices);
    void Draw() const;
    void Destroy();

    unsigned int GetTriangleCount() const { return m_IndexCount / 3; }

    // Built-in primitives
    static Mesh CreateCube();
    static Mesh CreateSphere(int segments = 32, int rings = 16);
    static Mesh CreateCylinder(int segments = 32);
    static Mesh CreatePlane();
    static Mesh CreateCone(int segments = 32);
    static Mesh CreateTorus(float innerRadius = 0.3f, int rings = 24, int segments = 12);

private:
    unsigned int m_VAO = 0, m_VBO = 0, m_EBO = 0;
    unsigned int m_IndexCount = 0;
};

} // namespace Kevla
`;

const MESH_CPP = `#include "Engine/Renderer/Mesh.h"
#include <glad/glad.h>
#include <cmath>

namespace Kevla {

Mesh::~Mesh() { Destroy(); }

Mesh::Mesh(Mesh&& o) noexcept
    : m_VAO(o.m_VAO), m_VBO(o.m_VBO), m_EBO(o.m_EBO), m_IndexCount(o.m_IndexCount) {
    o.m_VAO = o.m_VBO = o.m_EBO = o.m_IndexCount = 0;
}

Mesh& Mesh::operator=(Mesh&& o) noexcept {
    if (this != &o) {
        Destroy();
        m_VAO = o.m_VAO; m_VBO = o.m_VBO; m_EBO = o.m_EBO; m_IndexCount = o.m_IndexCount;
        o.m_VAO = o.m_VBO = o.m_EBO = o.m_IndexCount = 0;
    }
    return *this;
}

void Mesh::Create(const std::vector<Vertex>& vertices, const std::vector<unsigned int>& indices) {
    m_IndexCount = (unsigned int)indices.size();
    glGenVertexArrays(1, &m_VAO);
    glGenBuffers(1, &m_VBO);
    glGenBuffers(1, &m_EBO);

    glBindVertexArray(m_VAO);
    glBindBuffer(GL_ARRAY_BUFFER, m_VBO);
    glBufferData(GL_ARRAY_BUFFER, vertices.size() * sizeof(Vertex), vertices.data(), GL_STATIC_DRAW);
    glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, m_EBO);
    glBufferData(GL_ELEMENT_ARRAY_BUFFER, indices.size() * sizeof(unsigned int), indices.data(), GL_STATIC_DRAW);

    // Position
    glEnableVertexAttribArray(0);
    glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, sizeof(Vertex), (void*)offsetof(Vertex, position));
    // Normal
    glEnableVertexAttribArray(1);
    glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, sizeof(Vertex), (void*)offsetof(Vertex, normal));
    // TexCoords
    glEnableVertexAttribArray(2);
    glVertexAttribPointer(2, 2, GL_FLOAT, GL_FALSE, sizeof(Vertex), (void*)offsetof(Vertex, texCoords));

    glBindVertexArray(0);
}

void Mesh::Draw() const {
    glBindVertexArray(m_VAO);
    glDrawElements(GL_TRIANGLES, m_IndexCount, GL_UNSIGNED_INT, 0);
    glBindVertexArray(0);
}

void Mesh::Destroy() {
    if (m_VAO) { glDeleteVertexArrays(1, &m_VAO); m_VAO = 0; }
    if (m_VBO) { glDeleteBuffers(1, &m_VBO); m_VBO = 0; }
    if (m_EBO) { glDeleteBuffers(1, &m_EBO); m_EBO = 0; }
    m_IndexCount = 0;
}

Mesh Mesh::CreateCube() {
    std::vector<Vertex> v = {
        // Front
        {{-0.5f,-0.5f, 0.5f},{0,0,1},{0,0}}, {{ 0.5f,-0.5f, 0.5f},{0,0,1},{1,0}},
        {{ 0.5f, 0.5f, 0.5f},{0,0,1},{1,1}}, {{-0.5f, 0.5f, 0.5f},{0,0,1},{0,1}},
        // Back
        {{ 0.5f,-0.5f,-0.5f},{0,0,-1},{0,0}}, {{-0.5f,-0.5f,-0.5f},{0,0,-1},{1,0}},
        {{-0.5f, 0.5f,-0.5f},{0,0,-1},{1,1}}, {{ 0.5f, 0.5f,-0.5f},{0,0,-1},{0,1}},
        // Top
        {{-0.5f, 0.5f, 0.5f},{0,1,0},{0,0}}, {{ 0.5f, 0.5f, 0.5f},{0,1,0},{1,0}},
        {{ 0.5f, 0.5f,-0.5f},{0,1,0},{1,1}}, {{-0.5f, 0.5f,-0.5f},{0,1,0},{0,1}},
        // Bottom
        {{-0.5f,-0.5f,-0.5f},{0,-1,0},{0,0}}, {{ 0.5f,-0.5f,-0.5f},{0,-1,0},{1,0}},
        {{ 0.5f,-0.5f, 0.5f},{0,-1,0},{1,1}}, {{-0.5f,-0.5f, 0.5f},{0,-1,0},{0,1}},
        // Right
        {{ 0.5f,-0.5f, 0.5f},{1,0,0},{0,0}}, {{ 0.5f,-0.5f,-0.5f},{1,0,0},{1,0}},
        {{ 0.5f, 0.5f,-0.5f},{1,0,0},{1,1}}, {{ 0.5f, 0.5f, 0.5f},{1,0,0},{0,1}},
        // Left
        {{-0.5f,-0.5f,-0.5f},{-1,0,0},{0,0}}, {{-0.5f,-0.5f, 0.5f},{-1,0,0},{1,0}},
        {{-0.5f, 0.5f, 0.5f},{-1,0,0},{1,1}}, {{-0.5f, 0.5f,-0.5f},{-1,0,0},{0,1}},
    };
    std::vector<unsigned int> idx;
    for (unsigned int face = 0; face < 6; face++) {
        unsigned int base = face * 4;
        idx.insert(idx.end(), {base, base+1, base+2, base, base+2, base+3});
    }
    Mesh m; m.Create(v, idx); return m;
}

Mesh Mesh::CreateSphere(int seg, int ring) {
    std::vector<Vertex> v;
    std::vector<unsigned int> idx;
    const float PI = 3.14159265359f;
    for (int y = 0; y <= ring; y++) {
        for (int x = 0; x <= seg; x++) {
            float xSeg = (float)x / seg, ySeg = (float)y / ring;
            float xPos = std::cos(xSeg * 2.0f * PI) * std::sin(ySeg * PI);
            float yPos = std::cos(ySeg * PI);
            float zPos = std::sin(xSeg * 2.0f * PI) * std::sin(ySeg * PI);
            v.push_back({{xPos*0.5f, yPos*0.5f, zPos*0.5f}, {xPos, yPos, zPos}, {xSeg, ySeg}});
        }
    }
    for (int y = 0; y < ring; y++) {
        for (int x = 0; x < seg; x++) {
            unsigned int i0 = y*(seg+1)+x, i1 = i0+1;
            unsigned int i2 = (y+1)*(seg+1)+x, i3 = i2+1;
            idx.insert(idx.end(), {i0, i2, i1, i1, i2, i3});
        }
    }
    Mesh m; m.Create(v, idx); return m;
}

Mesh Mesh::CreatePlane() {
    std::vector<Vertex> v = {
        {{-0.5f,0,-0.5f},{0,1,0},{0,0}}, {{ 0.5f,0,-0.5f},{0,1,0},{1,0}},
        {{ 0.5f,0, 0.5f},{0,1,0},{1,1}}, {{-0.5f,0, 0.5f},{0,1,0},{0,1}},
    };
    Mesh m; m.Create(v, {0,1,2,0,2,3}); return m;
}

Mesh Mesh::CreateCylinder(int seg) {
    std::vector<Vertex> v;
    std::vector<unsigned int> idx;
    const float PI = 3.14159265359f;
    for (int i = 0; i <= seg; i++) {
        float a = (float)i / seg * 2.0f * PI;
        float x = std::cos(a) * 0.5f, z = std::sin(a) * 0.5f;
        glm::vec3 n = glm::normalize(glm::vec3(x, 0, z));
        v.push_back({{x, -0.5f, z}, n, {(float)i/seg, 0}});
        v.push_back({{x,  0.5f, z}, n, {(float)i/seg, 1}});
    }
    for (int i = 0; i < seg; i++) {
        unsigned int b = i * 2;
        idx.insert(idx.end(), {b, b+1, b+2, b+1, b+3, b+2});
    }
    Mesh m; m.Create(v, idx); return m;
}

Mesh Mesh::CreateCone(int seg) {
    std::vector<Vertex> v;
    std::vector<unsigned int> idx;
    const float PI = 3.14159265359f;
    // Apex
    v.push_back({{0, 0.5f, 0}, {0, 1, 0}, {0.5f, 1}});
    for (int i = 0; i <= seg; i++) {
        float a = (float)i / seg * 2.0f * PI;
        float x = std::cos(a) * 0.5f, z = std::sin(a) * 0.5f;
        glm::vec3 n = glm::normalize(glm::vec3(x, 0.5f, z));
        v.push_back({{x, -0.5f, z}, n, {(float)i/seg, 0}});
    }
    for (int i = 1; i <= seg; i++) idx.insert(idx.end(), {0, (unsigned)i, (unsigned)i+1});
    Mesh m; m.Create(v, idx); return m;
}

Mesh Mesh::CreateTorus(float ir, int rings, int segs) {
    std::vector<Vertex> v;
    std::vector<unsigned int> idx;
    const float PI = 3.14159265359f;
    float R = 0.4f, r = ir;
    for (int i = 0; i <= rings; i++) {
        float u = (float)i / rings * 2.0f * PI;
        for (int j = 0; j <= segs; j++) {
            float w = (float)j / segs * 2.0f * PI;
            float x = (R + r * std::cos(w)) * std::cos(u);
            float y = r * std::sin(w);
            float z = (R + r * std::cos(w)) * std::sin(u);
            glm::vec3 n = glm::normalize(glm::vec3(std::cos(w)*std::cos(u), std::sin(w), std::cos(w)*std::sin(u)));
            v.push_back({{x, y, z}, n, {(float)i/rings, (float)j/segs}});
        }
    }
    for (int i = 0; i < rings; i++) {
        for (int j = 0; j < segs; j++) {
            unsigned int a = i*(segs+1)+j, b = a+1, c = (i+1)*(segs+1)+j, d = c+1;
            idx.insert(idx.end(), {a, c, b, b, c, d});
        }
    }
    Mesh m; m.Create(v, idx); return m;
}

} // namespace Kevla
`;

const RENDERER_H = `#pragma once
// ============================================================
// KEVLA ENGINE — Renderer (OpenGL 4.5 PBR pipeline)
// ============================================================

#include "Engine/Renderer/Shader.h"
#include "Engine/Renderer/Mesh.h"
#include "Engine/Camera/Camera.h"
#include "Engine/Scene/Scene.h"
#include <unordered_map>
#include <memory>

namespace Kevla {

enum class MeshType { Cube, Sphere, Cylinder, Plane, Cone, Torus };

struct RenderStats {
    int drawCalls = 0;
    int triangles = 0;
    int entities = 0;
};

class Renderer {
public:
    bool Initialize();
    void Shutdown();

    void BeginScene(const Camera& camera);
    void RenderScene(const Scene& scene);
    void EndScene();

    void DrawMesh(MeshType type, const glm::mat4& model,
                  const glm::vec3& color, float metallic, float roughness);
    void DrawGrid();

    const RenderStats& GetStats() const { return m_Stats; }

private:
    std::unique_ptr<Shader> m_PBRShader;
    std::unique_ptr<Shader> m_GridShader;
    std::unordered_map<MeshType, std::unique_ptr<Mesh>> m_Meshes;

    glm::mat4 m_ViewMatrix{1.0f};
    glm::mat4 m_ProjMatrix{1.0f};
    glm::vec3 m_CameraPos{0.0f};
    RenderStats m_Stats;

    void CreatePrimitives();
    bool CreateShaders();
};

} // namespace Kevla
`;

const RENDERER_CPP = `#include "Engine/Renderer/Renderer.h"
#include <glad/glad.h>
#include <glm/gtc/matrix_transform.hpp>
#include <iostream>

namespace Kevla {

// ---- Embedded PBR vertex shader ----
static const char* PBR_VERT = R"(
#version 450 core
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aTexCoord;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
uniform mat3 uNormalMatrix;

out vec3 vWorldPos;
out vec3 vNormal;
out vec2 vTexCoord;

void main() {
    vec4 worldPos = uModel * vec4(aPos, 1.0);
    vWorldPos = worldPos.xyz;
    vNormal = normalize(uNormalMatrix * aNormal);
    vTexCoord = aTexCoord;
    gl_Position = uProjection * uView * worldPos;
}
)";

// ---- Embedded PBR fragment shader ----
static const char* PBR_FRAG = R"(
#version 450 core
in vec3 vWorldPos;
in vec3 vNormal;
in vec2 vTexCoord;

uniform vec3 uAlbedo;
uniform float uMetallic;
uniform float uRoughness;
uniform vec3 uCameraPos;
uniform vec3 uLightDir;
uniform vec3 uLightColor;

out vec4 FragColor;

const float PI = 3.14159265359;

// GGX Normal Distribution Function
float DistributionGGX(vec3 N, vec3 H, float roughness) {
    float a = roughness * roughness;
    float a2 = a * a;
    float NdotH = max(dot(N, H), 0.0);
    float denom = NdotH * NdotH * (a2 - 1.0) + 1.0;
    return a2 / (PI * denom * denom);
}

// Schlick Fresnel
vec3 FresnelSchlick(float cosTheta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

// Smith Geometry Function
float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
    float r = roughness + 1.0;
    float k = (r * r) / 8.0;
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float ggx1 = NdotV / (NdotV * (1.0 - k) + k);
    float ggx2 = NdotL / (NdotL * (1.0 - k) + k);
    return ggx1 * ggx2;
}

void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(uCameraPos - vWorldPos);
    vec3 L = normalize(-uLightDir);
    vec3 H = normalize(V + L);

    vec3 F0 = mix(vec3(0.04), uAlbedo, uMetallic);

    float NDF = DistributionGGX(N, H, uRoughness);
    float G = GeometrySmith(N, V, L, uRoughness);
    vec3 F = FresnelSchlick(max(dot(H, V), 0.0), F0);

    // Cook-Torrance specular BRDF
    vec3 num = NDF * G * F;
    float denom = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.0001;
    vec3 specular = num / denom;

    vec3 kD = (1.0 - F) * (1.0 - uMetallic);
    float NdotL = max(dot(N, L), 0.0);

    vec3 Lo = (kD * uAlbedo / PI + specular) * uLightColor * NdotL;

    // Ambient
    vec3 ambient = vec3(0.08) * uAlbedo;
    vec3 color = ambient + Lo;

    // HDR tone mapping (Reinhard) + gamma correction
    color = color / (color + vec3(1.0));
    color = pow(color, vec3(1.0 / 2.2));

    FragColor = vec4(color, 1.0);
}
)";

bool Renderer::Initialize() {
    std::cout << "[Renderer] Initializing PBR pipeline..." << std::endl;
    CreatePrimitives();
    return CreateShaders();
}

void Renderer::Shutdown() {
    m_Meshes.clear();
    m_PBRShader.reset();
    m_GridShader.reset();
}

bool Renderer::CreateShaders() {
    m_PBRShader = std::make_unique<Shader>();
    if (!m_PBRShader->LoadFromSource(PBR_VERT, PBR_FRAG)) {
        std::cerr << "[Renderer] Failed to create PBR shader!" << std::endl;
        return false;
    }
    std::cout << "[Renderer] PBR shader compiled." << std::endl;
    return true;
}

void Renderer::CreatePrimitives() {
    m_Meshes[MeshType::Cube]     = std::make_unique<Mesh>(Mesh::CreateCube());
    m_Meshes[MeshType::Sphere]   = std::make_unique<Mesh>(Mesh::CreateSphere());
    m_Meshes[MeshType::Cylinder] = std::make_unique<Mesh>(Mesh::CreateCylinder());
    m_Meshes[MeshType::Plane]    = std::make_unique<Mesh>(Mesh::CreatePlane());
    m_Meshes[MeshType::Cone]     = std::make_unique<Mesh>(Mesh::CreateCone());
    m_Meshes[MeshType::Torus]    = std::make_unique<Mesh>(Mesh::CreateTorus());
    std::cout << "[Renderer] 6 primitive meshes created." << std::endl;
}

void Renderer::BeginScene(const Camera& camera) {
    m_ViewMatrix = camera.GetViewMatrix();
    m_ProjMatrix = camera.GetProjectionMatrix();
    m_CameraPos  = camera.GetPosition();
    m_Stats = {};
}

void Renderer::RenderScene(const Scene& scene) {
    m_PBRShader->Bind();
    m_PBRShader->SetMat4("uView", m_ViewMatrix);
    m_PBRShader->SetMat4("uProjection", m_ProjMatrix);
    m_PBRShader->SetVec3("uCameraPos", m_CameraPos);
    m_PBRShader->SetVec3("uLightDir", glm::normalize(glm::vec3(-0.5f, -1.0f, -0.3f)));
    m_PBRShader->SetVec3("uLightColor", glm::vec3(2.5f));

    for (const auto& entity : scene.GetEntities()) {
        if (!entity->IsActive() || !entity->HasMeshRenderer()) continue;

        glm::mat4 model = entity->GetModelMatrix();
        glm::mat3 normalMat = glm::transpose(glm::inverse(glm::mat3(model)));

        m_PBRShader->SetMat4("uModel", model);
        m_PBRShader->SetMat3("uNormalMatrix", normalMat);
        m_PBRShader->SetVec3("uAlbedo", entity->GetColor());
        m_PBRShader->SetFloat("uMetallic", entity->GetMetallic());
        m_PBRShader->SetFloat("uRoughness", entity->GetRoughness());

        auto it = m_Meshes.find(entity->GetMeshType());
        if (it != m_Meshes.end()) {
            it->second->Draw();
            m_Stats.drawCalls++;
            m_Stats.triangles += it->second->GetTriangleCount();
        }
        m_Stats.entities++;
    }
    m_PBRShader->Unbind();
}

void Renderer::EndScene() {}

void Renderer::DrawMesh(MeshType type, const glm::mat4& model,
                        const glm::vec3& color, float metallic, float roughness) {
    m_PBRShader->Bind();
    m_PBRShader->SetMat4("uModel", model);
    m_PBRShader->SetMat3("uNormalMatrix", glm::transpose(glm::inverse(glm::mat3(model))));
    m_PBRShader->SetVec3("uAlbedo", color);
    m_PBRShader->SetFloat("uMetallic", metallic);
    m_PBRShader->SetFloat("uRoughness", roughness);
    auto it = m_Meshes.find(type);
    if (it != m_Meshes.end()) it->second->Draw();
    m_PBRShader->Unbind();
}

} // namespace Kevla
`;

// ============================================================
// ENGINE/CAMERA
// ============================================================

const CAMERA_H = `#pragma once
// ============================================================
// KEVLA ENGINE — Camera (FPS + Orbit modes)
// ============================================================

#include <glm/glm.hpp>

namespace Kevla {

class Camera {
public:
    Camera(float fov = 60.0f, float aspect = 16.0f/9.0f);

    // View/projection
    glm::mat4 GetViewMatrix() const;
    glm::mat4 GetProjectionMatrix() const;

    // Transform
    void SetPosition(const glm::vec3& pos) { m_Position = pos; }
    void LookAt(const glm::vec3& target);
    void SetAspect(float aspect) { m_Aspect = aspect; }

    glm::vec3 GetPosition() const { return m_Position; }
    glm::vec3 GetFront() const { return m_Front; }
    glm::vec3 GetRight() const { return m_Right; }
    glm::vec3 GetUp() const { return m_Up; }

    // Input
    void ProcessKeyboard(int direction, float dt);
    void ProcessMouseMovement(float xOffset, float yOffset);
    void ProcessMouseScroll(float yOffset);

    float GetFOV() const { return m_FOV; }
    float GetNear() const { return m_Near; }
    float GetFar() const { return m_Far; }
    float GetSpeed() const { return m_Speed; }
    void SetSpeed(float s) { m_Speed = s; }

    enum Direction { FORWARD, BACKWARD, LEFT, RIGHT, UP, DOWN };

private:
    void UpdateVectors();

    glm::vec3 m_Position{0.0f, 5.0f, 10.0f};
    glm::vec3 m_Front{0.0f, 0.0f, -1.0f};
    glm::vec3 m_Up{0.0f, 1.0f, 0.0f};
    glm::vec3 m_Right{1.0f, 0.0f, 0.0f};
    glm::vec3 m_WorldUp{0.0f, 1.0f, 0.0f};

    float m_Yaw = -135.0f;
    float m_Pitch = -25.0f;
    float m_FOV = 60.0f;
    float m_Aspect = 16.0f / 9.0f;
    float m_Near = 0.1f;
    float m_Far = 500.0f;
    float m_Speed = 8.0f;
    float m_Sensitivity = 0.15f;
};

} // namespace Kevla
`;

const CAMERA_CPP = `#include "Engine/Camera/Camera.h"
#include <glm/gtc/matrix_transform.hpp>
#include <algorithm>
#include <cmath>

namespace Kevla {

Camera::Camera(float fov, float aspect) : m_FOV(fov), m_Aspect(aspect) {
    UpdateVectors();
}

glm::mat4 Camera::GetViewMatrix() const {
    return glm::lookAt(m_Position, m_Position + m_Front, m_Up);
}

glm::mat4 Camera::GetProjectionMatrix() const {
    return glm::perspective(glm::radians(m_FOV), m_Aspect, m_Near, m_Far);
}

void Camera::LookAt(const glm::vec3& target) {
    glm::vec3 dir = glm::normalize(target - m_Position);
    m_Pitch = glm::degrees(asinf(dir.y));
    m_Yaw = glm::degrees(atan2f(dir.z, dir.x));
    UpdateVectors();
}

void Camera::ProcessKeyboard(int direction, float dt) {
    float velocity = m_Speed * dt;
    switch (direction) {
        case FORWARD:  m_Position += m_Front * velocity; break;
        case BACKWARD: m_Position -= m_Front * velocity; break;
        case LEFT:     m_Position -= m_Right * velocity; break;
        case RIGHT:    m_Position += m_Right * velocity; break;
        case UP:       m_Position += m_WorldUp * velocity; break;
        case DOWN:     m_Position -= m_WorldUp * velocity; break;
    }
}

void Camera::ProcessMouseMovement(float xOff, float yOff) {
    m_Yaw   += xOff * m_Sensitivity;
    m_Pitch += yOff * m_Sensitivity;
    m_Pitch = std::clamp(m_Pitch, -89.0f, 89.0f);
    UpdateVectors();
}

void Camera::ProcessMouseScroll(float yOffset) {
    m_FOV -= yOffset;
    m_FOV = std::clamp(m_FOV, 10.0f, 120.0f);
}

void Camera::UpdateVectors() {
    float yawRad = glm::radians(m_Yaw), pitchRad = glm::radians(m_Pitch);
    m_Front = glm::normalize(glm::vec3(
        cosf(yawRad) * cosf(pitchRad),
        sinf(pitchRad),
        sinf(yawRad) * cosf(pitchRad)));
    m_Right = glm::normalize(glm::cross(m_Front, m_WorldUp));
    m_Up    = glm::normalize(glm::cross(m_Right, m_Front));
}

} // namespace Kevla
`;

// ============================================================
// ENGINE/SCENE (Entity + Scene)
// ============================================================

const ENTITY_H = `#pragma once
// ============================================================
// KEVLA ENGINE — Entity (Component-based game object)
// ============================================================

#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>
#include <string>
#include <vector>

namespace Kevla {

enum class MeshType;

struct Transform {
    glm::vec3 position{0.0f};
    glm::vec3 rotation{0.0f}; // Euler degrees
    glm::vec3 scale{1.0f};
};

struct MaterialData {
    glm::vec3 color{0.5f, 0.5f, 1.0f};
    float metallic = 0.2f;
    float roughness = 0.6f;
};

struct RigidbodyData {
    float mass = 1.0f;
    bool useGravity = true;
    bool isKinematic = false;
    float restitution = 0.4f;
    float friction = 0.5f;
    glm::vec3 velocity{0.0f};
};

struct ColliderData {
    std::string shape = "box"; // box, sphere, capsule
    glm::vec3 size{1.0f};
    float radius = 0.5f;
    bool isTrigger = false;
};

struct ScriptData {
    std::string name;
    std::string filepath;
    bool enabled = true;
};

class Entity {
public:
    Entity(const std::string& name, uint32_t id);

    // Identity
    uint32_t GetID() const { return m_ID; }
    const std::string& GetName() const { return m_Name; }
    void SetName(const std::string& n) { m_Name = n; }
    bool IsActive() const { return m_Active; }
    void SetActive(bool a) { m_Active = a; }

    // Transform
    Transform& GetTransform() { return m_Transform; }
    const Transform& GetTransform() const { return m_Transform; }
    glm::mat4 GetModelMatrix() const;

    // Mesh Renderer
    void AddMeshRenderer(MeshType type);
    bool HasMeshRenderer() const { return m_HasMesh; }
    MeshType GetMeshType() const { return m_MeshType; }

    // Material
    MaterialData& GetMaterial() { return m_Material; }
    glm::vec3 GetColor() const { return m_Material.color; }
    float GetMetallic() const { return m_Material.metallic; }
    float GetRoughness() const { return m_Material.roughness; }

    // Rigidbody
    void AddRigidbody(float mass = 1.0f);
    bool HasRigidbody() const { return m_HasRigidbody; }
    RigidbodyData& GetRigidbody() { return m_Rigidbody; }

    // Collider
    void AddCollider(const std::string& shape = "box");
    bool HasCollider() const { return m_HasCollider; }
    ColliderData& GetCollider() { return m_Collider; }

    // Scripts
    void AddScript(const std::string& name, const std::string& path);
    std::vector<ScriptData>& GetScripts() { return m_Scripts; }

private:
    uint32_t m_ID;
    std::string m_Name;
    bool m_Active = true;

    Transform m_Transform;
    MaterialData m_Material;

    bool m_HasMesh = false;
    MeshType m_MeshType;

    bool m_HasRigidbody = false;
    RigidbodyData m_Rigidbody;

    bool m_HasCollider = false;
    ColliderData m_Collider;

    std::vector<ScriptData> m_Scripts;
};

} // namespace Kevla
`;

const ENTITY_CPP = `#include "Engine/Scene/Entity.h"
#include "Engine/Renderer/Renderer.h"

namespace Kevla {

Entity::Entity(const std::string& name, uint32_t id)
    : m_ID(id), m_Name(name), m_MeshType(MeshType::Cube) {}

glm::mat4 Entity::GetModelMatrix() const {
    glm::mat4 model(1.0f);
    model = glm::translate(model, m_Transform.position);
    model = glm::rotate(model, glm::radians(m_Transform.rotation.x), {1,0,0});
    model = glm::rotate(model, glm::radians(m_Transform.rotation.y), {0,1,0});
    model = glm::rotate(model, glm::radians(m_Transform.rotation.z), {0,0,1});
    model = glm::scale(model, m_Transform.scale);
    return model;
}

void Entity::AddMeshRenderer(MeshType type) {
    m_HasMesh = true;
    m_MeshType = type;
}

void Entity::AddRigidbody(float mass) {
    m_HasRigidbody = true;
    m_Rigidbody.mass = mass;
    m_Rigidbody.useGravity = mass > 0.0f;
    m_Rigidbody.isKinematic = mass == 0.0f;
}

void Entity::AddCollider(const std::string& shape) {
    m_HasCollider = true;
    m_Collider.shape = shape;
    m_Collider.size = m_Transform.scale;
}

void Entity::AddScript(const std::string& name, const std::string& path) {
    m_Scripts.push_back({name, path, true});
}

} // namespace Kevla
`;

const SCENE_H = `#pragma once
// ============================================================
// KEVLA ENGINE — Scene (Entity container + management)
// ============================================================

#include "Engine/Scene/Entity.h"
#include <vector>
#include <memory>
#include <string>

namespace Kevla {

class Scene {
public:
    Scene(const std::string& name = "Untitled");

    const std::string& GetName() const { return m_Name; }
    void SetName(const std::string& n) { m_Name = n; }

    Entity* CreateEntity(const std::string& name);
    void RemoveEntity(uint32_t id);
    Entity* FindEntity(const std::string& name);
    Entity* GetEntity(uint32_t id);

    const std::vector<std::shared_ptr<Entity>>& GetEntities() const { return m_Entities; }
    std::vector<std::shared_ptr<Entity>>& GetEntities() { return m_Entities; }

    void Clear();

private:
    std::string m_Name;
    std::vector<std::shared_ptr<Entity>> m_Entities;
    uint32_t m_NextID = 1;
};

} // namespace Kevla
`;

const SCENE_CPP = `#include "Engine/Scene/Scene.h"
#include <algorithm>
#include <iostream>

namespace Kevla {

Scene::Scene(const std::string& name) : m_Name(name) {}

Entity* Scene::CreateEntity(const std::string& name) {
    auto entity = std::make_shared<Entity>(name, m_NextID++);
    m_Entities.push_back(entity);
    std::cout << "[Scene] Created entity: " << name << " (ID " << entity->GetID() << ")" << std::endl;
    return entity.get();
}

void Scene::RemoveEntity(uint32_t id) {
    m_Entities.erase(
        std::remove_if(m_Entities.begin(), m_Entities.end(),
            [id](const auto& e) { return e->GetID() == id; }),
        m_Entities.end());
}

Entity* Scene::FindEntity(const std::string& name) {
    for (auto& e : m_Entities)
        if (e->GetName() == name) return e.get();
    return nullptr;
}

Entity* Scene::GetEntity(uint32_t id) {
    for (auto& e : m_Entities)
        if (e->GetID() == id) return e.get();
    return nullptr;
}

void Scene::Clear() {
    m_Entities.clear();
    m_NextID = 1;
}

} // namespace Kevla
`;

// ============================================================
// ENGINE/PHYSICS (Bullet Physics integration)
// ============================================================

const PHYSICS_H = `#pragma once
// ============================================================
// KEVLA ENGINE — PhysicsWorld (Bullet Physics SDK)
// ============================================================

#include <glm/glm.hpp>
#include <btBulletDynamicsCommon.h>
#include <memory>
#include <unordered_map>
#include <string>

namespace Kevla {

class PhysicsWorld {
public:
    PhysicsWorld() = default;
    ~PhysicsWorld();

    void Initialize(const glm::vec3& gravity = {0, -9.81f, 0});
    void Shutdown();

    void StepSimulation(float dt);
    void Clear();

    // Rigidbody management
    void AddBoxBody(uint32_t entityId, const glm::vec3& pos,
                    const glm::vec3& halfExtents, float mass);
    void AddSphereBody(uint32_t entityId, const glm::vec3& pos,
                       float radius, float mass);
    void RemoveBody(uint32_t entityId);

    // Query
    glm::vec3 GetPosition(uint32_t entityId) const;
    glm::vec3 GetRotation(uint32_t entityId) const;
    void SetGravity(const glm::vec3& g);

    void ApplyForce(uint32_t entityId, const glm::vec3& force);
    void ApplyImpulse(uint32_t entityId, const glm::vec3& impulse);

private:
    std::unique_ptr<btDefaultCollisionConfiguration>     m_Config;
    std::unique_ptr<btCollisionDispatcher>               m_Dispatcher;
    std::unique_ptr<btBroadphaseInterface>               m_Broadphase;
    std::unique_ptr<btSequentialImpulseConstraintSolver>  m_Solver;
    std::unique_ptr<btDiscreteDynamicsWorld>              m_World;

    struct BodyInfo {
        btRigidBody* body = nullptr;
        btCollisionShape* shape = nullptr;
        btDefaultMotionState* motionState = nullptr;
    };
    std::unordered_map<uint32_t, BodyInfo> m_Bodies;
};

} // namespace Kevla
`;

const PHYSICS_CPP = `#include "Engine/Physics/PhysicsWorld.h"
#include <glm/gtc/quaternion.hpp>
#include <iostream>

namespace Kevla {

PhysicsWorld::~PhysicsWorld() { Shutdown(); }

void PhysicsWorld::Initialize(const glm::vec3& gravity) {
    m_Config     = std::make_unique<btDefaultCollisionConfiguration>();
    m_Dispatcher = std::make_unique<btCollisionDispatcher>(m_Config.get());
    m_Broadphase = std::make_unique<btDbvtBroadphase>();
    m_Solver     = std::make_unique<btSequentialImpulseConstraintSolver>();
    m_World      = std::make_unique<btDiscreteDynamicsWorld>(
        m_Dispatcher.get(), m_Broadphase.get(), m_Solver.get(), m_Config.get());
    m_World->setGravity(btVector3(gravity.x, gravity.y, gravity.z));

    // Add a static ground plane at y=0
    auto* groundShape = new btStaticPlaneShape(btVector3(0, 1, 0), 0);
    auto* groundMotion = new btDefaultMotionState();
    btRigidBody::btRigidBodyConstructionInfo groundCI(0, groundMotion, groundShape);
    auto* groundBody = new btRigidBody(groundCI);
    groundBody->setRestitution(0.5f);
    groundBody->setFriction(0.8f);
    m_World->addRigidBody(groundBody);

    std::cout << "[Physics] Bullet Physics initialized." << std::endl;
}

void PhysicsWorld::Shutdown() {
    Clear();
    m_World.reset();
    m_Solver.reset();
    m_Broadphase.reset();
    m_Dispatcher.reset();
    m_Config.reset();
}

void PhysicsWorld::StepSimulation(float dt) {
    if (m_World) m_World->stepSimulation(dt, 8, 1.0f / 120.0f);
}

void PhysicsWorld::Clear() {
    for (auto& [id, info] : m_Bodies) {
        m_World->removeRigidBody(info.body);
        delete info.body;
        delete info.shape;
        delete info.motionState;
    }
    m_Bodies.clear();
}

void PhysicsWorld::AddBoxBody(uint32_t entityId, const glm::vec3& pos,
                              const glm::vec3& half, float mass) {
    auto* shape = new btBoxShape(btVector3(half.x, half.y, half.z));
    auto* motion = new btDefaultMotionState(
        btTransform(btQuaternion(0,0,0,1), btVector3(pos.x, pos.y, pos.z)));
    btVector3 inertia(0,0,0);
    if (mass > 0) shape->calculateLocalInertia(mass, inertia);
    btRigidBody::btRigidBodyConstructionInfo ci(mass, motion, shape, inertia);
    ci.m_restitution = 0.4f;
    ci.m_friction = 0.5f;
    auto* body = new btRigidBody(ci);
    m_World->addRigidBody(body);
    m_Bodies[entityId] = {body, shape, motion};
}

void PhysicsWorld::AddSphereBody(uint32_t entityId, const glm::vec3& pos,
                                  float radius, float mass) {
    auto* shape = new btSphereShape(radius);
    auto* motion = new btDefaultMotionState(
        btTransform(btQuaternion(0,0,0,1), btVector3(pos.x, pos.y, pos.z)));
    btVector3 inertia(0,0,0);
    if (mass > 0) shape->calculateLocalInertia(mass, inertia);
    btRigidBody::btRigidBodyConstructionInfo ci(mass, motion, shape, inertia);
    ci.m_restitution = 0.6f;
    auto* body = new btRigidBody(ci);
    m_World->addRigidBody(body);
    m_Bodies[entityId] = {body, shape, motion};
}

void PhysicsWorld::RemoveBody(uint32_t entityId) {
    auto it = m_Bodies.find(entityId);
    if (it == m_Bodies.end()) return;
    m_World->removeRigidBody(it->second.body);
    delete it->second.body;
    delete it->second.shape;
    delete it->second.motionState;
    m_Bodies.erase(it);
}

glm::vec3 PhysicsWorld::GetPosition(uint32_t entityId) const {
    auto it = m_Bodies.find(entityId);
    if (it == m_Bodies.end()) return glm::vec3(0);
    btTransform t;
    it->second.body->getMotionState()->getWorldTransform(t);
    auto p = t.getOrigin();
    return {p.x(), p.y(), p.z()};
}

glm::vec3 PhysicsWorld::GetRotation(uint32_t entityId) const {
    auto it = m_Bodies.find(entityId);
    if (it == m_Bodies.end()) return glm::vec3(0);
    btTransform t;
    it->second.body->getMotionState()->getWorldTransform(t);
    btScalar y, p, r;
    t.getRotation().getEulerZYX(y, p, r);
    return glm::degrees(glm::vec3(r, p, y));
}

void PhysicsWorld::SetGravity(const glm::vec3& g) {
    if (m_World) m_World->setGravity(btVector3(g.x, g.y, g.z));
}

void PhysicsWorld::ApplyForce(uint32_t id, const glm::vec3& f) {
    auto it = m_Bodies.find(id);
    if (it != m_Bodies.end()) {
        it->second.body->activate();
        it->second.body->applyCentralForce(btVector3(f.x, f.y, f.z));
    }
}

void PhysicsWorld::ApplyImpulse(uint32_t id, const glm::vec3& imp) {
    auto it = m_Bodies.find(id);
    if (it != m_Bodies.end()) {
        it->second.body->activate();
        it->second.body->applyCentralImpulse(btVector3(imp.x, imp.y, imp.z));
    }
}

} // namespace Kevla
`;

// ============================================================
// ENGINE/SCRIPTING (Lua + sol2)
// ============================================================

const LUA_MANAGER_H = `#pragma once
// ============================================================
// KEVLA ENGINE — LuaManager (sol2 integration)
// ============================================================

#define SOL_ALL_SAFETIES_ON 1
#include <sol/sol.hpp>
#include <string>
#include <unordered_map>

namespace Kevla {

class Scene;

class ScriptSystem {
public:
    void Initialize();
    void Shutdown();

    void LoadScript(const std::string& filepath);
    void Update(float dt);
    void BindScene(Scene* scene);

    sol::state& GetLua() { return m_Lua; }

private:
    sol::state m_Lua;
    Scene* m_Scene = nullptr;
    float m_Time = 0.0f;

    void RegisterAPI();
};

} // namespace Kevla
`;

const LUA_MANAGER_CPP = `#include "Engine/Scripting/ScriptSystem.h"
#include "Engine/Scene/Scene.h"
#include "Engine/Scene/Entity.h"
#include <iostream>

namespace Kevla {

void ScriptSystem::Initialize() {
    m_Lua.open_libraries(
        sol::lib::base, sol::lib::math, sol::lib::string,
        sol::lib::table, sol::lib::io);
    RegisterAPI();
    std::cout << "[Scripting] Lua 5.4 initialized with sol2." << std::endl;
}

void ScriptSystem::Shutdown() { /* sol::state cleans up automatically */ }

void ScriptSystem::RegisterAPI() {
    // Expose Vector3
    m_Lua.new_usertype<glm::vec3>("Vector3",
        sol::constructors<glm::vec3(), glm::vec3(float, float, float)>(),
        "x", &glm::vec3::x,
        "y", &glm::vec3::y,
        "z", &glm::vec3::z);

    // Expose Transform
    m_Lua.new_usertype<Transform>("Transform",
        "position", &Transform::position,
        "rotation", &Transform::rotation,
        "scale", &Transform::scale);

    // Expose Entity
    m_Lua.new_usertype<Entity>("Entity",
        "name", sol::property(&Entity::GetName, &Entity::SetName),
        "active", sol::property(&Entity::IsActive, &Entity::SetActive),
        "transform", sol::property(
            [](Entity& e) -> Transform& { return e.GetTransform(); }),
        "position", sol::property(
            [](Entity& e) -> glm::vec3& { return e.GetTransform().position; }),
        "rotation", sol::property(
            [](Entity& e) -> glm::vec3& { return e.GetTransform().rotation; }),
        "scale", sol::property(
            [](Entity& e) -> glm::vec3& { return e.GetTransform().scale; }));

    // Expose print
    m_Lua["print"] = [](const std::string& msg) {
        std::cout << "[Lua] " << msg << std::endl;
    };

    // Global time
    m_Lua["time"] = 0.0f;
    m_Lua["dt"] = 0.0f;
}

void ScriptSystem::LoadScript(const std::string& filepath) {
    try {
        m_Lua.script_file(filepath);
        std::cout << "[Scripting] Loaded: " << filepath << std::endl;
    } catch (const sol::error& e) {
        std::cerr << "[Scripting] Error in " << filepath << ": " << e.what() << std::endl;
    }
}

void ScriptSystem::BindScene(Scene* scene) { m_Scene = scene; }

void ScriptSystem::Update(float dt) {
    m_Time += dt;
    m_Lua["time"] = m_Time;
    m_Lua["dt"] = dt;

    if (!m_Scene) return;

    // Call Update(entity, dt) for each entity with scripts
    for (auto& entity : m_Scene->GetEntities()) {
        for (auto& script : entity->GetScripts()) {
            if (!script.enabled) continue;
            try {
                sol::function updateFn = m_Lua["Update"];
                if (updateFn.valid()) {
                    updateFn(entity.get(), dt);
                }
            } catch (const sol::error& e) {
                std::cerr << "[Script] " << entity->GetName() << ": " << e.what() << std::endl;
            }
        }
    }
}

} // namespace Kevla
`;

// ============================================================
// ENGINE/INPUT
// ============================================================

const INPUT_H = `#pragma once
// ============================================================
// KEVLA ENGINE — InputManager (GLFW input handling)
// ============================================================

#include <unordered_set>

struct GLFWwindow;

namespace Kevla {

class InputManager {
public:
    InputManager(GLFWwindow* window);

    void Update();

    bool IsKeyDown(int key) const;
    bool IsKeyPressed(int key) const;
    bool IsKeyReleased(int key) const;
    bool IsMouseButtonDown(int button) const;

    float GetMouseX() const { return m_MouseX; }
    float GetMouseY() const { return m_MouseY; }
    float GetMouseDeltaX() const { return m_DeltaX; }
    float GetMouseDeltaY() const { return m_DeltaY; }
    float GetScrollDelta() const { return m_ScrollDelta; }

private:
    GLFWwindow* m_Window;
    float m_MouseX = 0, m_MouseY = 0;
    float m_LastMouseX = 0, m_LastMouseY = 0;
    float m_DeltaX = 0, m_DeltaY = 0;
    float m_ScrollDelta = 0;
    bool m_FirstMouse = true;

    std::unordered_set<int> m_PrevKeys;
    std::unordered_set<int> m_CurrKeys;

    static void ScrollCallback(GLFWwindow* w, double x, double y);
    static float s_ScrollDelta;
};

} // namespace Kevla
`;

const INPUT_CPP = `#include "Engine/Input/InputManager.h"
#include <GLFW/glfw3.h>

namespace Kevla {

float InputManager::s_ScrollDelta = 0.0f;

InputManager::InputManager(GLFWwindow* window) : m_Window(window) {
    glfwSetScrollCallback(window, ScrollCallback);
}

void InputManager::Update() {
    m_PrevKeys = m_CurrKeys;
    m_CurrKeys.clear();

    // Poll commonly used keys
    int keys[] = {
        GLFW_KEY_W, GLFW_KEY_A, GLFW_KEY_S, GLFW_KEY_D,
        GLFW_KEY_Q, GLFW_KEY_E, GLFW_KEY_SPACE, GLFW_KEY_LEFT_SHIFT,
        GLFW_KEY_ESCAPE, GLFW_KEY_F5, GLFW_KEY_DELETE,
        GLFW_KEY_UP, GLFW_KEY_DOWN, GLFW_KEY_LEFT, GLFW_KEY_RIGHT,
        GLFW_KEY_LEFT_CONTROL, GLFW_KEY_Z, GLFW_KEY_Y,
    };
    for (int k : keys) {
        if (glfwGetKey(m_Window, k) == GLFW_PRESS) m_CurrKeys.insert(k);
    }

    // Mouse position
    double mx, my;
    glfwGetCursorPos(m_Window, &mx, &my);
    m_MouseX = (float)mx;
    m_MouseY = (float)my;
    if (m_FirstMouse) { m_LastMouseX = m_MouseX; m_LastMouseY = m_MouseY; m_FirstMouse = false; }
    m_DeltaX = m_MouseX - m_LastMouseX;
    m_DeltaY = m_LastMouseY - m_MouseY; // Inverted
    m_LastMouseX = m_MouseX;
    m_LastMouseY = m_MouseY;

    m_ScrollDelta = s_ScrollDelta;
    s_ScrollDelta = 0.0f;
}

bool InputManager::IsKeyDown(int key) const { return m_CurrKeys.count(key) > 0; }
bool InputManager::IsKeyPressed(int key) const { return m_CurrKeys.count(key) > 0 && m_PrevKeys.count(key) == 0; }
bool InputManager::IsKeyReleased(int key) const { return m_CurrKeys.count(key) == 0 && m_PrevKeys.count(key) > 0; }
bool InputManager::IsMouseButtonDown(int button) const { return glfwGetMouseButton(m_Window, button) == GLFW_PRESS; }

void InputManager::ScrollCallback(GLFWwindow*, double, double y) { s_ScrollDelta = (float)y; }

} // namespace Kevla
`;

// ============================================================
// ENGINE/PROJECT (JSON serialization)
// ============================================================

const PROJECT_H = `#pragma once
// ============================================================
// KEVLA ENGINE — ProjectManager (project save/load)
// ============================================================

#include <string>
#include <vector>

namespace Kevla {

struct ProjectConfig {
    std::string name = "MyGame";
    std::string version = "1.0.0";
    std::string startScene = "Default.scene";
    std::vector<std::string> scenes;
};

class ProjectManager {
public:
    bool CreateProject(const std::string& path, const std::string& name);
    bool LoadProject(const std::string& path);
    bool SaveProject();

    const ProjectConfig& GetConfig() const { return m_Config; }
    const std::string& GetProjectPath() const { return m_ProjectPath; }
    bool IsLoaded() const { return m_Loaded; }

private:
    ProjectConfig m_Config;
    std::string m_ProjectPath;
    bool m_Loaded = false;
};

} // namespace Kevla
`;

const PROJECT_CPP = `#include "Engine/Project/ProjectManager.h"
#include <nlohmann/json.hpp>
#include <fstream>
#include <filesystem>
#include <iostream>

namespace fs = std::filesystem;
using json = nlohmann::json;

namespace Kevla {

bool ProjectManager::CreateProject(const std::string& path, const std::string& name) {
    m_ProjectPath = path;
    m_Config.name = name;

    // Create directory structure
    fs::create_directories(path + "/Assets/Models");
    fs::create_directories(path + "/Assets/Textures");
    fs::create_directories(path + "/Assets/Scripts");
    fs::create_directories(path + "/Assets/Materials");
    fs::create_directories(path + "/Assets/Scenes");
    fs::create_directories(path + "/Assets/Shaders");

    m_Config.scenes.push_back("Default.scene");
    SaveProject();
    m_Loaded = true;
    std::cout << "[Project] Created: " << name << " at " << path << std::endl;
    return true;
}

bool ProjectManager::LoadProject(const std::string& path) {
    std::string configFile = path + "/" + fs::path(path).filename().string() + ".kevla";
    std::ifstream file(configFile);
    if (!file.is_open()) return false;

    json j;
    file >> j;
    m_Config.name = j.value("name", "Untitled");
    m_Config.version = j.value("version", "1.0.0");
    m_Config.startScene = j.value("start_scene", "Default.scene");
    m_Config.scenes = j.value("scenes", std::vector<std::string>{});

    m_ProjectPath = path;
    m_Loaded = true;
    std::cout << "[Project] Loaded: " << m_Config.name << std::endl;
    return true;
}

bool ProjectManager::SaveProject() {
    json j;
    j["name"] = m_Config.name;
    j["version"] = m_Config.version;
    j["start_scene"] = m_Config.startScene;
    j["scenes"] = m_Config.scenes;
    j["engine_version"] = KEVLA_VERSION;

    std::string filename = m_ProjectPath + "/" + m_Config.name + ".kevla";
    std::ofstream file(filename);
    file << j.dump(2);
    return true;
}

} // namespace Kevla
`;

const SERIALIZER_H = `#pragma once
// ============================================================
// KEVLA ENGINE — SceneSerializer (JSON scene files)
// ============================================================

#include "Engine/Scene/Scene.h"
#include <memory>
#include <string>

namespace Kevla {

class SceneSerializer {
public:
    void Serialize(const Scene& scene, const std::string& filepath);
    std::unique_ptr<Scene> Deserialize(const std::string& filepath);
};

} // namespace Kevla
`;

const SERIALIZER_CPP = `#include "Engine/Project/SceneSerializer.h"
#include "Engine/Renderer/Renderer.h"
#include <nlohmann/json.hpp>
#include <fstream>
#include <iostream>

using json = nlohmann::json;

namespace Kevla {

void SceneSerializer::Serialize(const Scene& scene, const std::string& filepath) {
    json j;
    j["scene"]["name"] = scene.GetName();
    j["scene"]["version"] = "1.0";

    json entities = json::array();
    for (const auto& entity : scene.GetEntities()) {
        json e;
        e["name"] = entity->GetName();
        e["active"] = entity->IsActive();
        e["transform"]["position"] = {
            entity->GetTransform().position.x,
            entity->GetTransform().position.y,
            entity->GetTransform().position.z};
        e["transform"]["rotation"] = {
            entity->GetTransform().rotation.x,
            entity->GetTransform().rotation.y,
            entity->GetTransform().rotation.z};
        e["transform"]["scale"] = {
            entity->GetTransform().scale.x,
            entity->GetTransform().scale.y,
            entity->GetTransform().scale.z};
        e["material"]["color"] = {
            entity->GetColor().r, entity->GetColor().g, entity->GetColor().b};
        e["material"]["metallic"] = entity->GetMetallic();
        e["material"]["roughness"] = entity->GetRoughness();
        if (entity->HasRigidbody()) {
            e["rigidbody"]["mass"] = entity->GetRigidbody().mass;
            e["rigidbody"]["useGravity"] = entity->GetRigidbody().useGravity;
            e["rigidbody"]["restitution"] = entity->GetRigidbody().restitution;
        }
        entities.push_back(e);
    }
    j["entities"] = entities;

    std::ofstream file(filepath);
    file << j.dump(2);
    std::cout << "[Serializer] Saved scene: " << filepath << std::endl;
}

std::unique_ptr<Scene> SceneSerializer::Deserialize(const std::string& filepath) {
    std::ifstream file(filepath);
    if (!file.is_open()) {
        std::cerr << "[Serializer] Cannot open: " << filepath << std::endl;
        return nullptr;
    }
    json j;
    file >> j;

    auto scene = std::make_unique<Scene>(j["scene"]["name"].get<std::string>());
    for (const auto& je : j["entities"]) {
        auto* entity = scene->CreateEntity(je["name"].get<std::string>());
        entity->SetActive(je.value("active", true));
        auto& t = entity->GetTransform();
        auto pos = je["transform"]["position"];
        t.position = {pos[0], pos[1], pos[2]};
        auto rot = je["transform"]["rotation"];
        t.rotation = {rot[0], rot[1], rot[2]};
        auto scl = je["transform"]["scale"];
        t.scale = {scl[0], scl[1], scl[2]};
        entity->AddMeshRenderer(MeshType::Cube);
    }
    return scene;
}

} // namespace Kevla
`;

// ============================================================
// EDITOR
// ============================================================

const EDITOR_H = `#pragma once
// ============================================================
// KEVLA ENGINE — Editor (ImGui Docking)
// ============================================================

#include "Engine/Core/Engine.h"
#include <imgui.h>

namespace Kevla {

class Editor {
public:
    Editor(Engine& engine);

    bool Initialize();
    void Shutdown();

    void BeginFrame();
    void RenderPanels();
    void EndFrame();

private:
    Engine& m_Engine;
    bool m_ShowHierarchy = true;
    bool m_ShowInspector = true;
    bool m_ShowConsole = true;
    bool m_ShowAssetBrowser = true;
    bool m_ShowViewport = true;
    uint32_t m_SelectedEntity = 0;

    // Panel renderers
    void RenderMenuBar();
    void RenderHierarchy();
    void RenderInspector();
    void RenderViewport();
    void RenderConsole();
    void RenderAssetBrowser();

    void ApplyDarkTheme();
};

} // namespace Kevla
`;

const EDITOR_CPP = `#include "Editor/Editor.h"
#include <imgui.h>
#include <imgui_impl_glfw.h>
#include <imgui_impl_opengl3.h>
#include <iostream>
#include <filesystem>

namespace Kevla {

Editor::Editor(Engine& engine) : m_Engine(engine) {}

bool Editor::Initialize() {
    IMGUI_CHECKVERSION();
    ImGui::CreateContext();
    ImGuiIO& io = ImGui::GetIO();
    io.ConfigFlags |= ImGuiConfigFlags_DockingEnable;
    io.ConfigFlags |= ImGuiConfigFlags_ViewportsEnable;

    ImGui_ImplGlfw_InitForOpenGL(m_Engine.GetWindow().GetNativeHandle(), true);
    ImGui_ImplOpenGL3_Init("#version 450");

    ApplyDarkTheme();
    std::cout << "[Editor] ImGui initialized with docking." << std::endl;
    return true;
}

void Editor::Shutdown() {
    ImGui_ImplOpenGL3_Shutdown();
    ImGui_ImplGlfw_Shutdown();
    ImGui::DestroyContext();
}

void Editor::BeginFrame() {
    ImGui_ImplOpenGL3_NewFrame();
    ImGui_ImplGlfw_NewFrame();
    ImGui::NewFrame();

    // Enable dockspace over entire viewport
    ImGuiViewport* viewport = ImGui::GetMainViewport();
    ImGui::SetNextWindowPos(viewport->WorkPos);
    ImGui::SetNextWindowSize(viewport->WorkSize);
    ImGui::SetNextWindowViewport(viewport->ID);
    ImGui::PushStyleVar(ImGuiStyleVar_WindowRounding, 0.0f);
    ImGui::PushStyleVar(ImGuiStyleVar_WindowBorderSize, 0.0f);
    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(0, 0));

    ImGui::Begin("DockSpace", nullptr,
        ImGuiWindowFlags_MenuBar | ImGuiWindowFlags_NoDocking |
        ImGuiWindowFlags_NoTitleBar | ImGuiWindowFlags_NoCollapse |
        ImGuiWindowFlags_NoResize | ImGuiWindowFlags_NoMove |
        ImGuiWindowFlags_NoBringToFrontOnFocus | ImGuiWindowFlags_NoNavFocus);
    ImGui::PopStyleVar(3);

    ImGui::DockSpace(ImGui::GetID("KevlaDockSpace"));
}

void Editor::RenderPanels() {
    RenderMenuBar();
    if (m_ShowHierarchy) RenderHierarchy();
    if (m_ShowInspector) RenderInspector();
    if (m_ShowViewport) RenderViewport();
    if (m_ShowConsole) RenderConsole();
    if (m_ShowAssetBrowser) RenderAssetBrowser();
}

void Editor::EndFrame() {
    ImGui::End(); // DockSpace

    ImGui::Render();
    ImGui_ImplOpenGL3_RenderDrawData(ImGui::GetDrawData());

    ImGuiIO& io = ImGui::GetIO();
    if (io.ConfigFlags & ImGuiConfigFlags_ViewportsEnable) {
        GLFWwindow* ctx = glfwGetCurrentContext();
        ImGui::UpdatePlatformWindows();
        ImGui::RenderPlatformWindowsDefault();
        glfwMakeContextCurrent(ctx);
    }
}

void Editor::RenderMenuBar() {
    if (ImGui::BeginMenuBar()) {
        if (ImGui::BeginMenu("File")) {
            if (ImGui::MenuItem("New Scene"))  m_Engine.NewScene();
            if (ImGui::MenuItem("Save Scene")) m_Engine.SaveScene("scene.json");
            if (ImGui::MenuItem("Load Scene")) m_Engine.LoadScene("scene.json");
            ImGui::Separator();
            if (ImGui::MenuItem("Exit")) glfwSetWindowShouldClose(
                m_Engine.GetWindow().GetNativeHandle(), true);
            ImGui::EndMenu();
        }
        if (ImGui::BeginMenu("GameObject")) {
            if (ImGui::MenuItem("Cube"))     m_Engine.GetActiveScene().CreateEntity("Cube")->AddMeshRenderer(MeshType::Cube);
            if (ImGui::MenuItem("Sphere"))   m_Engine.GetActiveScene().CreateEntity("Sphere")->AddMeshRenderer(MeshType::Sphere);
            if (ImGui::MenuItem("Cylinder")) m_Engine.GetActiveScene().CreateEntity("Cylinder")->AddMeshRenderer(MeshType::Cylinder);
            if (ImGui::MenuItem("Plane"))    m_Engine.GetActiveScene().CreateEntity("Plane")->AddMeshRenderer(MeshType::Plane);
            if (ImGui::MenuItem("Cone"))     m_Engine.GetActiveScene().CreateEntity("Cone")->AddMeshRenderer(MeshType::Cone);
            if (ImGui::MenuItem("Torus"))    m_Engine.GetActiveScene().CreateEntity("Torus")->AddMeshRenderer(MeshType::Torus);
            ImGui::EndMenu();
        }
        if (ImGui::BeginMenu("Window")) {
            ImGui::MenuItem("Hierarchy", nullptr, &m_ShowHierarchy);
            ImGui::MenuItem("Inspector", nullptr, &m_ShowInspector);
            ImGui::MenuItem("Viewport", nullptr, &m_ShowViewport);
            ImGui::MenuItem("Console", nullptr, &m_ShowConsole);
            ImGui::MenuItem("Assets", nullptr, &m_ShowAssetBrowser);
            ImGui::EndMenu();
        }
        ImGui::EndMenuBar();
    }
}

void Editor::RenderHierarchy() {
    ImGui::Begin("Hierarchy", &m_ShowHierarchy);
    auto& entities = m_Engine.GetActiveScene().GetEntities();
    for (auto& e : entities) {
        ImGuiTreeNodeFlags flags = ImGuiTreeNodeFlags_Leaf | ImGuiTreeNodeFlags_SpanAvailWidth;
        if (e->GetID() == m_SelectedEntity) flags |= ImGuiTreeNodeFlags_Selected;
        bool open = ImGui::TreeNodeEx((void*)(intptr_t)e->GetID(), flags, "%s", e->GetName().c_str());
        if (ImGui::IsItemClicked()) m_SelectedEntity = e->GetID();
        if (open) ImGui::TreePop();
    }
    ImGui::End();
}

void Editor::RenderInspector() {
    ImGui::Begin("Inspector", &m_ShowInspector);
    auto* entity = m_Engine.GetActiveScene().GetEntity(m_SelectedEntity);
    if (!entity) { ImGui::Text("No entity selected."); ImGui::End(); return; }

    char nameBuf[256];
    strncpy(nameBuf, entity->GetName().c_str(), sizeof(nameBuf));
    if (ImGui::InputText("Name", nameBuf, sizeof(nameBuf)))
        entity->SetName(nameBuf);

    bool active = entity->IsActive();
    if (ImGui::Checkbox("Active", &active)) entity->SetActive(active);

    // Transform
    if (ImGui::CollapsingHeader("Transform", ImGuiTreeNodeFlags_DefaultOpen)) {
        ImGui::DragFloat3("Position", &entity->GetTransform().position[0], 0.1f);
        ImGui::DragFloat3("Rotation", &entity->GetTransform().rotation[0], 1.0f);
        ImGui::DragFloat3("Scale",    &entity->GetTransform().scale[0], 0.05f, 0.01f, 100.0f);
    }

    // Material
    if (ImGui::CollapsingHeader("Material", ImGuiTreeNodeFlags_DefaultOpen)) {
        ImGui::ColorEdit3("Color", &entity->GetMaterial().color[0]);
        ImGui::SliderFloat("Metallic", &entity->GetMaterial().metallic, 0, 1);
        ImGui::SliderFloat("Roughness", &entity->GetMaterial().roughness, 0, 1);
    }

    // Add Component
    if (ImGui::Button("+ Add Component", ImVec2(-1, 0))) ImGui::OpenPopup("AddComponent");
    if (ImGui::BeginPopup("AddComponent")) {
        if (ImGui::MenuItem("Rigidbody") && !entity->HasRigidbody()) entity->AddRigidbody();
        if (ImGui::MenuItem("Box Collider") && !entity->HasCollider()) entity->AddCollider("box");
        if (ImGui::MenuItem("Lua Script")) entity->AddScript("move", "Assets/Scripts/move.lua");
        ImGui::EndPopup();
    }
    ImGui::End();
}

void Editor::RenderViewport() {
    ImGui::Begin("Scene Viewport", &m_ShowViewport);
    ImVec2 size = ImGui::GetContentRegionAvail();
    ImGui::Text("3D Viewport (%dx%d)", (int)size.x, (int)size.y);
    ImGui::Text("FPS: %d | Entities: %d",
        m_Engine.GetFPS(),
        (int)m_Engine.GetActiveScene().GetEntities().size());
    ImGui::Text("Draw Calls: %d | Triangles: %d",
        m_Engine.GetRenderer().GetStats().drawCalls,
        m_Engine.GetRenderer().GetStats().triangles);
    ImGui::End();
}

void Editor::RenderConsole() {
    ImGui::Begin("Console", &m_ShowConsole);
    if (ImGui::Button("Clear")) { /* Clear log */ }
    ImGui::Separator();
    ImGui::TextWrapped("KEVLA Engine v%s ready.", KEVLA_VERSION);
    ImGui::End();
}

void Editor::RenderAssetBrowser() {
    ImGui::Begin("Asset Browser", &m_ShowAssetBrowser);
    const char* folders[] = {"Models", "Textures", "Scripts", "Materials", "Shaders"};
    for (const char* folder : folders) {
        if (ImGui::TreeNode(folder)) {
            std::string path = std::string("Assets/") + folder;
            if (std::filesystem::exists(path)) {
                for (auto& entry : std::filesystem::directory_iterator(path)) {
                    ImGui::BulletText("%s", entry.path().filename().string().c_str());
                }
            } else {
                ImGui::TextDisabled("(empty)");
            }
            ImGui::TreePop();
        }
    }
    ImGui::End();
}

void Editor::ApplyDarkTheme() {
    ImGui::StyleColorsDark();
    ImGuiStyle& style = ImGui::GetStyle();
    style.WindowRounding = 2.0f;
    style.FrameRounding = 3.0f;
    style.GrabRounding = 2.0f;
    style.TabRounding = 3.0f;
    style.FramePadding = ImVec2(8, 4);
    style.ItemSpacing = ImVec2(8, 5);
    style.WindowPadding = ImVec2(10, 10);
    style.ScrollbarSize = 12.0f;
    style.IndentSpacing = 18.0f;
    style.Colors[ImGuiCol_WindowBg]   = ImVec4(0.10f, 0.10f, 0.12f, 1.00f);
    style.Colors[ImGuiCol_ChildBg]    = ImVec4(0.10f, 0.10f, 0.12f, 1.00f);
    style.Colors[ImGuiCol_PopupBg]    = ImVec4(0.12f, 0.12f, 0.14f, 0.96f);
    style.Colors[ImGuiCol_Border]     = ImVec4(0.22f, 0.22f, 0.26f, 1.00f);
    style.Colors[ImGuiCol_FrameBg]    = ImVec4(0.15f, 0.15f, 0.18f, 1.00f);
    style.Colors[ImGuiCol_TitleBg]    = ImVec4(0.08f, 0.08f, 0.10f, 1.00f);
    style.Colors[ImGuiCol_TitleBgActive] = ImVec4(0.12f, 0.12f, 0.14f, 1.00f);
    style.Colors[ImGuiCol_Tab]        = ImVec4(0.15f, 0.15f, 0.18f, 1.00f);
    style.Colors[ImGuiCol_TabHovered] = ImVec4(0.24f, 0.42f, 0.72f, 0.80f);
    style.Colors[ImGuiCol_TabActive]  = ImVec4(0.20f, 0.36f, 0.62f, 1.00f);
    style.Colors[ImGuiCol_Header]     = ImVec4(0.18f, 0.18f, 0.22f, 1.00f);
    style.Colors[ImGuiCol_HeaderHovered] = ImVec4(0.24f, 0.42f, 0.72f, 0.80f);
    style.Colors[ImGuiCol_Button]     = ImVec4(0.18f, 0.18f, 0.22f, 1.00f);
    style.Colors[ImGuiCol_ButtonHovered] = ImVec4(0.24f, 0.42f, 0.72f, 0.80f);
    style.Colors[ImGuiCol_DockingPreview] = ImVec4(0.24f, 0.42f, 0.72f, 0.70f);
}

} // namespace Kevla
`;

// ============================================================
// ASSETS
// ============================================================

const MOVE_LUA = `-- ============================================================
-- KEVLA ENGINE — Example Lua Script
-- Move an object with keyboard input
-- ============================================================

local speed = 5

function Start(object, dt)
    print("Script started on: " .. object.name)
end

function Update(object, dt)
    -- WASD movement
    if Input.GetKey("w") then
        object.position.z = object.position.z - speed * dt
    end
    if Input.GetKey("s") then
        object.position.z = object.position.z + speed * dt
    end
    if Input.GetKey("a") then
        object.position.x = object.position.x - speed * dt
    end
    if Input.GetKey("d") then
        object.position.x = object.position.x + speed * dt
    end

    -- Rotation
    object.rotation.y = object.rotation.y + 30 * dt
end
`;

// ============================================================
// BUILD SCRIPTS
// ============================================================

const BUILD_BAT = `@echo off
REM ============================================================
REM KEVLA ENGINE — Windows Build Script
REM Requirements: CMake 3.21+, Visual Studio 2022 or MinGW
REM ============================================================

echo.
echo ========================================
echo   KEVLA ENGINE — Build System
echo ========================================
echo.

REM Check CMake
cmake --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: CMake not found. Install from https://cmake.org/download/
    exit /b 1
)

REM Create build directory
if not exist "build" mkdir build
cd build

REM Configure (Visual Studio 2022)
echo [1/2] Configuring with CMake...
cmake .. -G "Visual Studio 17 2022" -A x64 -DCMAKE_BUILD_TYPE=Release
if %errorlevel% neq 0 (
    echo ERROR: CMake configuration failed!
    cd ..
    exit /b 1
)

REM Build
echo [2/2] Building KevlaEditor.exe...
cmake --build . --config Release --parallel %NUMBER_OF_PROCESSORS%
if %errorlevel% neq 0 (
    echo ERROR: Build failed!
    cd ..
    exit /b 1
)

cd ..

echo.
echo ========================================
echo   BUILD SUCCESSFUL!
echo   Output: build/bin/Release/KevlaEditor.exe
echo ========================================
echo.

REM Optionally run
if "%1"=="--run" (
    echo Starting KevlaEditor...
    start build\\bin\\Release\\KevlaEditor.exe
)
`;

const BUILD_SH = `#!/bin/bash
# ============================================================
# KEVLA ENGINE — Linux/macOS Build Script
# Requirements: CMake 3.21+, GCC 11+ or Clang 14+
# ============================================================

set -e

echo ""
echo "========================================"
echo "  KEVLA ENGINE — Build System"
echo "========================================"
echo ""

# Check dependencies
command -v cmake >/dev/null 2>&1 || { echo "ERROR: CMake not found."; exit 1; }
command -v g++ >/dev/null 2>&1 || command -v clang++ >/dev/null 2>&1 || { echo "ERROR: No C++ compiler found."; exit 1; }

# Install Linux dependencies (if needed)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "Checking Linux dependencies..."
    sudo apt-get install -y -qq libgl1-mesa-dev libx11-dev libxrandr-dev \\
        libxinerama-dev libxcursor-dev libxi-dev 2>/dev/null || true
fi

# Create build directory
mkdir -p build && cd build

# Configure
echo "[1/2] Configuring with CMake..."
cmake .. -DCMAKE_BUILD_TYPE=Release

# Build
NPROC=\$(nproc 2>/dev/null || sysctl -n hw.logicalcpu 2>/dev/null || echo 4)
echo "[2/2] Building KevlaEditor (\$NPROC threads)..."
cmake --build . --config Release -j\$NPROC

cd ..

echo ""
echo "========================================"
echo "  BUILD SUCCESSFUL!"
echo "  Output: build/bin/KevlaEditor"
echo "========================================"
echo ""

# Optionally run
if [[ "\$1" == "--run" ]]; then
    echo "Starting KevlaEditor..."
    ./build/bin/KevlaEditor
fi
`;

const README_MD = `# KEVLA Engine

**A production-level 3D game engine and editor.**

\`\`\`
Output: KevlaEditor.exe
Language: C++17
Graphics: OpenGL 4.5 (PBR pipeline)
Physics: Bullet Physics SDK
Scripting: Lua 5.4 (sol2 bindings)
UI: ImGui (docking branch)
Build: CMake 3.21+
\`\`\`

---

## Prerequisites

### Windows
- **CMake** 3.21+ — [cmake.org/download](https://cmake.org/download/)
- **Visual Studio 2022** (Community edition is free) with C++ workload
- **Git** — [git-scm.com](https://git-scm.com/)

### Linux (Ubuntu/Debian)
\`\`\`bash
sudo apt install cmake g++ git libgl1-mesa-dev \\
  libx11-dev libxrandr-dev libxinerama-dev libxcursor-dev libxi-dev
\`\`\`

### macOS
\`\`\`bash
brew install cmake
xcode-select --install
\`\`\`

---

## Build Instructions

### Windows (Visual Studio)
\`\`\`batch
git clone <repo-url> Kevla
cd Kevla
build_windows.bat
\`\`\`

Or manually:
\`\`\`batch
mkdir build && cd build
cmake .. -G "Visual Studio 17 2022" -A x64
cmake --build . --config Release
\`\`\`

### Linux / macOS
\`\`\`bash
git clone <repo-url> Kevla
cd Kevla
chmod +x build_linux.sh
./build_linux.sh
\`\`\`

Or manually:
\`\`\`bash
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
cmake --build . -j$(nproc)
\`\`\`

---

## Running

\`\`\`bash
# Windows
build\\bin\\Release\\KevlaEditor.exe

# Linux/macOS
./build/bin/KevlaEditor
\`\`\`

---

## Project Structure

\`\`\`
Kevla/
├── CMakeLists.txt          # Root build configuration
├── main.cpp                # Entry point
├── build_windows.bat       # Windows build script
├── build_linux.sh          # Linux/macOS build script
├── Engine/
│   ├── Core/               # Engine lifecycle
│   ├── Window/             # GLFW window management
│   ├── Renderer/           # OpenGL 4.5 PBR pipeline
│   ├── Camera/             # FPS/Orbit camera
│   ├── Scene/              # Entity Component System
│   ├── Physics/            # Bullet Physics integration
│   ├── Scripting/          # Lua 5.4 + sol2 scripting
│   ├── Input/              # GLFW input handling
│   └── Project/            # JSON project serialization
├── Editor/
│   └── Editor.cpp          # ImGui docking editor
├── Assets/
│   ├── Scripts/            # Lua scripts
│   ├── Shaders/            # GLSL shaders
│   ├── Models/             # 3D models
│   └── Textures/           # Texture files
└── vendor/
    └── glad/               # OpenGL loader
\`\`\`

---

## Dependencies (auto-downloaded by CMake)

| Library | Version | Purpose |
|---------|---------|---------|
| GLFW | 3.3.9 | Windowing & input |
| GLAD | 4.5 Core | OpenGL function loading |
| GLM | 0.9.9.8 | Math library |
| ImGui | Docking | Editor UI |
| Bullet | 3.25 | Physics simulation |
| Lua | 5.4.6 | Scripting language |
| sol2 | 3.3.0 | C++/Lua bindings |
| nlohmann/json | 3.11.3 | JSON serialization |
| stb_image | latest | Image loading |

All dependencies are downloaded automatically via CMake FetchContent.
No manual installation required.

---

## License

MIT License — See LICENSE file.
`;

// ============================================================
// BUILD THE FOLDER TREE
// ============================================================

export const BUILD_PROJECT: SourceFolder = {
  name: 'Kevla',
  path: 'Kevla',
  files: [
    { name: 'CMakeLists.txt', path: 'CMakeLists.txt', lang: 'cmake', content: ROOT_CMAKE },
    { name: 'main.cpp', path: 'main.cpp', lang: 'cpp', content: MAIN_CPP },
    { name: 'build_windows.bat', path: 'build_windows.bat', lang: 'batch', content: BUILD_BAT },
    { name: 'build_linux.sh', path: 'build_linux.sh', lang: 'shell', content: BUILD_SH },
    { name: 'README.md', path: 'README.md', lang: 'markdown', content: README_MD },
  ],
  folders: [
    {
      name: 'Engine',
      path: 'Engine',
      files: [],
      folders: [
        {
          name: 'Core', path: 'Engine/Core', folders: [],
          files: [
            { name: 'Engine.h', path: 'Engine/Core/Engine.h', lang: 'cpp', content: ENGINE_H },
            { name: 'Engine.cpp', path: 'Engine/Core/Engine.cpp', lang: 'cpp', content: ENGINE_CPP },
          ],
        },
        {
          name: 'Window', path: 'Engine/Window', folders: [],
          files: [
            { name: 'Window.h', path: 'Engine/Window/Window.h', lang: 'cpp', content: WINDOW_H },
            { name: 'Window.cpp', path: 'Engine/Window/Window.cpp', lang: 'cpp', content: WINDOW_CPP },
          ],
        },
        {
          name: 'Renderer', path: 'Engine/Renderer', folders: [],
          files: [
            { name: 'Shader.h', path: 'Engine/Renderer/Shader.h', lang: 'cpp', content: SHADER_H },
            { name: 'Shader.cpp', path: 'Engine/Renderer/Shader.cpp', lang: 'cpp', content: SHADER_CPP },
            { name: 'Mesh.h', path: 'Engine/Renderer/Mesh.h', lang: 'cpp', content: MESH_H },
            { name: 'Mesh.cpp', path: 'Engine/Renderer/Mesh.cpp', lang: 'cpp', content: MESH_CPP },
            { name: 'Renderer.h', path: 'Engine/Renderer/Renderer.h', lang: 'cpp', content: RENDERER_H },
            { name: 'Renderer.cpp', path: 'Engine/Renderer/Renderer.cpp', lang: 'cpp', content: RENDERER_CPP },
          ],
        },
        {
          name: 'Camera', path: 'Engine/Camera', folders: [],
          files: [
            { name: 'Camera.h', path: 'Engine/Camera/Camera.h', lang: 'cpp', content: CAMERA_H },
            { name: 'Camera.cpp', path: 'Engine/Camera/Camera.cpp', lang: 'cpp', content: CAMERA_CPP },
          ],
        },
        {
          name: 'Scene', path: 'Engine/Scene', folders: [],
          files: [
            { name: 'Entity.h', path: 'Engine/Scene/Entity.h', lang: 'cpp', content: ENTITY_H },
            { name: 'Entity.cpp', path: 'Engine/Scene/Entity.cpp', lang: 'cpp', content: ENTITY_CPP },
            { name: 'Scene.h', path: 'Engine/Scene/Scene.h', lang: 'cpp', content: SCENE_H },
            { name: 'Scene.cpp', path: 'Engine/Scene/Scene.cpp', lang: 'cpp', content: SCENE_CPP },
          ],
        },
        {
          name: 'Physics', path: 'Engine/Physics', folders: [],
          files: [
            { name: 'PhysicsWorld.h', path: 'Engine/Physics/PhysicsWorld.h', lang: 'cpp', content: PHYSICS_H },
            { name: 'PhysicsWorld.cpp', path: 'Engine/Physics/PhysicsWorld.cpp', lang: 'cpp', content: PHYSICS_CPP },
          ],
        },
        {
          name: 'Scripting', path: 'Engine/Scripting', folders: [],
          files: [
            { name: 'ScriptSystem.h', path: 'Engine/Scripting/ScriptSystem.h', lang: 'cpp', content: LUA_MANAGER_H },
            { name: 'ScriptSystem.cpp', path: 'Engine/Scripting/ScriptSystem.cpp', lang: 'cpp', content: LUA_MANAGER_CPP },
          ],
        },
        {
          name: 'Input', path: 'Engine/Input', folders: [],
          files: [
            { name: 'InputManager.h', path: 'Engine/Input/InputManager.h', lang: 'cpp', content: INPUT_H },
            { name: 'InputManager.cpp', path: 'Engine/Input/InputManager.cpp', lang: 'cpp', content: INPUT_CPP },
          ],
        },
        {
          name: 'Project', path: 'Engine/Project', folders: [],
          files: [
            { name: 'ProjectManager.h', path: 'Engine/Project/ProjectManager.h', lang: 'cpp', content: PROJECT_H },
            { name: 'ProjectManager.cpp', path: 'Engine/Project/ProjectManager.cpp', lang: 'cpp', content: PROJECT_CPP },
            { name: 'SceneSerializer.h', path: 'Engine/Project/SceneSerializer.h', lang: 'cpp', content: SERIALIZER_H },
            { name: 'SceneSerializer.cpp', path: 'Engine/Project/SceneSerializer.cpp', lang: 'cpp', content: SERIALIZER_CPP },
          ],
        },
      ],
    },
    {
      name: 'Editor', path: 'Editor', folders: [],
      files: [
        { name: 'Editor.h', path: 'Editor/Editor.h', lang: 'cpp', content: EDITOR_H },
        { name: 'Editor.cpp', path: 'Editor/Editor.cpp', lang: 'cpp', content: EDITOR_CPP },
      ],
    },
    {
      name: 'Assets', path: 'Assets',
      files: [],
      folders: [
        { name: 'Scripts', path: 'Assets/Scripts', folders: [],
          files: [{ name: 'move.lua', path: 'Assets/Scripts/move.lua', lang: 'lua', content: MOVE_LUA }] },
        { name: 'Models', path: 'Assets/Models', folders: [], files: [] },
        { name: 'Textures', path: 'Assets/Textures', folders: [], files: [] },
        { name: 'Shaders', path: 'Assets/Shaders', folders: [], files: [] },
      ],
    },
  ],
};

// ---- Utility: flatten all files ----
export function getAllFiles(folder: SourceFolder): SourceFile[] {
  const files: SourceFile[] = [...folder.files];
  for (const sub of folder.folders) files.push(...getAllFiles(sub));
  return files;
}

// ---- Utility: count lines ----
export function getTotalLines(): number {
  return getAllFiles(BUILD_PROJECT).reduce((sum, f) => sum + f.content.split('\n').length, 0);
}

// ---- Utility: count files ----
export function getTotalFiles(): number {
  return getAllFiles(BUILD_PROJECT).length;
}
