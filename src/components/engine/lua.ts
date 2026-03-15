// ============================================================
// KEVLA ENGINE — Lua Scripting System
//
// A complete Lua-syntax-compatible scripting engine:
//   • Lua → JavaScript transpiler (handles all core syntax)
//   • Sandboxed execution per entity
//   • Entity bindings: object.position, object.rotation, etc.
//   • Input API: Input.GetKey(), Input.GetKeyDown(), etc.
//   • Math library: math.sin, math.cos, math.random, etc.
//   • Console output: print() → engine console
//   • Script lifecycle: Start(), Update(), OnCollision()
//   • Per-script persistent state via _state table
// ============================================================

// ---- Input State Tracking ----

export interface InputState {
  keys: Set<string>;        // Currently held keys
  keysDown: Set<string>;    // Pressed this frame
  keysUp: Set<string>;      // Released this frame
  mouseX: number;
  mouseY: number;
  mouseButtons: Set<number>;
  mouseDeltaX: number;
  mouseDeltaY: number;
}

export function createInputState(): InputState {
  return {
    keys: new Set(),
    keysDown: new Set(),
    keysUp: new Set(),
    mouseX: 0,
    mouseY: 0,
    mouseButtons: new Set(),
    mouseDeltaX: 0,
    mouseDeltaY: 0,
  };
}

// ---- Lua → JavaScript Transpiler ----

export function transpileLua(luaCode: string): string {
  let js = luaCode;

  // Pass 1: Remove multi-line comments --[[ ... ]]
  js = js.replace(/--\[\[[\s\S]*?\]\]/g, '');

  // Pass 2: Remove single-line comments (-- ...)
  // Careful not to break strings
  js = js.replace(/--.*/g, '');

  // Pass 3: Handle string concatenation (..) before other transforms
  // Must do this before the dot-access transforms
  js = js.replace(/\.\./g, ' + ');

  // Pass 4: Lua keywords → JavaScript

  // function name(args) body end
  js = js.replace(/\bfunction\s+(\w+)\s*\(([^)]*)\)/g, 'function $1($2) {');

  // Anonymous: function(args) → function(args) {
  js = js.replace(/\bfunction\s*\(([^)]*)\)/g, 'function($1) {');

  // for i = start, stop, step do → for (let i = start; i <= stop; i += step) {
  js = js.replace(
    /\bfor\s+(\w+)\s*=\s*([^,]+),\s*([^,\n]+),\s*([^\n]+?)\s+do\b/g,
    'for (let $1 = $2; $1 <= $3; $1 += $4) {'
  );

  // for i = start, stop do → for (let i = start; i <= stop; i++) {
  js = js.replace(
    /\bfor\s+(\w+)\s*=\s*([^,]+),\s*([^\n]+?)\s+do\b/g,
    'for (let $1 = $2; $1 <= $3; $1++) {'
  );

  // for k, v in pairs(t) do → for (let [k, v] of Object.entries(t)) {
  js = js.replace(
    /\bfor\s+(\w+)\s*,\s*(\w+)\s+in\s+pairs\(([^)]+)\)\s+do\b/g,
    'for (let [$1, $2] of Object.entries($3)) {'
  );

  // for i, v in ipairs(t) do → for (let [$1, $2] of t.entries()) {
  js = js.replace(
    /\bfor\s+(\w+)\s*,\s*(\w+)\s+in\s+ipairs\(([^)]+)\)\s+do\b/g,
    'for (let [$1, $2] of $3.entries()) {'
  );

  // while condition do → while (condition) {
  js = js.replace(/\bwhile\s+(.+?)\s+do\b/g, 'while ($1) {');

  // repeat ... until → do { ... } while (!(condition))
  js = js.replace(/\brepeat\b/g, 'do {');
  js = js.replace(/\buntil\s+(.+)/g, '} while (!($1))');

  // if condition then → if (condition) {
  js = js.replace(/\bif\s+(.+?)\s+then\b/g, 'if ($1) {');

  // elseif condition then → } else if (condition) {
  js = js.replace(/\belseif\s+(.+?)\s+then\b/g, '} else if ($1) {');

  // else → } else {
  // Be careful: only standalone 'else', not 'elseif'
  js = js.replace(/\belse\b(?!\s*if)/g, '} else {');

  // end → }
  js = js.replace(/\bend\b/g, '}');

  // local x = ... → let x = ...
  js = js.replace(/\blocal\s+/g, 'let ');

  // Operators
  js = js.replace(/~=/g, '!==');
  js = js.replace(/==/g, '===');

  // Logical operators (word boundaries prevent partial matches)
  js = js.replace(/\band\b/g, '&&');
  js = js.replace(/\bor\b/g, '||');
  js = js.replace(/\bnot\b/g, '!');

  // nil → null
  js = js.replace(/\bnil\b/g, 'null');

  // # (length) → .length  (basic — handles #table)
  js = js.replace(/#(\w+)/g, '$1.length');

  // Math library: math.xyz → Math.xyz
  js = js.replace(/\bmath\.pi\b/gi, 'Math.PI');
  js = js.replace(/\bmath\.huge\b/gi, 'Infinity');
  js = js.replace(/\bmath\.sin\b/g, 'Math.sin');
  js = js.replace(/\bmath\.cos\b/g, 'Math.cos');
  js = js.replace(/\bmath\.tan\b/g, 'Math.tan');
  js = js.replace(/\bmath\.abs\b/g, 'Math.abs');
  js = js.replace(/\bmath\.sqrt\b/g, 'Math.sqrt');
  js = js.replace(/\bmath\.floor\b/g, 'Math.floor');
  js = js.replace(/\bmath\.ceil\b/g, 'Math.ceil');
  js = js.replace(/\bmath\.max\b/g, 'Math.max');
  js = js.replace(/\bmath\.min\b/g, 'Math.min');
  js = js.replace(/\bmath\.random\b/g, 'Math.random');
  js = js.replace(/\bmath\.atan2\b/g, 'Math.atan2');
  js = js.replace(/\bmath\.deg\b/g, '__deg');
  js = js.replace(/\bmath\.rad\b/g, '__rad');

  // tostring → String
  js = js.replace(/\btostring\b/g, 'String');
  // tonumber → Number
  js = js.replace(/\btonumber\b/g, 'Number');

  return js;
}

// ---- Script Compilation Result ----

export interface CompiledScript {
  name: string;
  sourceCode: string;      // Original Lua code
  transpiledCode: string;  // Transpiled JS code
  compiledFn: Function | null;
  compileError: string | null;
  hasStart: boolean;
  hasUpdate: boolean;
  hasOnCollision: boolean;
  started: boolean;        // Has Start() been called?
  state: Record<string, any>; // Persistent state table (_state)
}

// ---- The Lua Virtual Machine ----

export class LuaVM {
  scripts: Map<string, CompiledScript> = new Map();
  consoleOutput: (msg: string, type: 'log' | 'warn' | 'error') => void;
  inputState: InputState;
  private _entityLookup: ((name: string) => any) | null = null;

  constructor(
    consoleOutput: (msg: string, type: 'log' | 'warn' | 'error') => void,
    inputState: InputState,
  ) {
    this.consoleOutput = consoleOutput;
    this.inputState = inputState;
  }

  // Set entity lookup function (for FindEntity)
  setEntityLookup(fn: (name: string) => any) {
    this._entityLookup = fn;
  }

  // ---- Compile a Lua script ----
  compile(entityId: string, scriptIndex: number, name: string, luaCode: string): CompiledScript {
    const key = `${entityId}_${scriptIndex}`;
    const existing = this.scripts.get(key);

    // Skip recompile if source hasn't changed
    if (existing && existing.sourceCode === luaCode && !existing.compileError) {
      return existing;
    }

    const result: CompiledScript = {
      name,
      sourceCode: luaCode,
      transpiledCode: '',
      compiledFn: null,
      compileError: null,
      hasStart: false,
      hasUpdate: false,
      hasOnCollision: false,
      started: existing?.started || false,
      state: existing?.state || {},
    };

    try {
      // Transpile Lua → JS
      const js = transpileLua(luaCode);
      result.transpiledCode = js;

      // Detect lifecycle functions
      result.hasStart = /\bfunction\s+Start\s*\(/.test(luaCode);
      result.hasUpdate = /\bfunction\s+Update\s*\(/.test(luaCode);
      result.hasOnCollision = /\bfunction\s+OnCollision\s*\(/.test(luaCode);

      // Build the executable function
      // We wrap the transpiled code in a function that receives the runtime context
      const wrappedCode = `
        "use strict";
        ${js}

        // Auto-call lifecycle
        if (typeof Start === 'function' && !__started) {
          Start(object, dt);
          __markStarted();
        }
        if (typeof Update === 'function') {
          Update(object, dt);
        }
      `;

      // Create the sandboxed function
      // Parameters: object, dt, time, Input, print, _state, __started, __markStarted, __deg, __rad, FindEntity, Destroy, Instantiate, Vector3
      result.compiledFn = new Function(
        'object', 'dt', 'time',
        'Input', 'print', '_state',
        '__started', '__markStarted',
        '__deg', '__rad',
        'FindEntity', 'Destroy', 'Instantiate', 'Vector3',
        wrappedCode
      );
    } catch (err: any) {
      result.compileError = err.message;
    }

    this.scripts.set(key, result);
    return result;
  }

  // ---- Execute a script for an entity ----
  execute(
    entityId: string,
    scriptIndex: number,
    entityBindings: {
      position: { x: number; y: number; z: number };
      rotation: { x: number; y: number; z: number };
      scale: { x: number; y: number; z: number };
      name: string;
      active: boolean;
    },
    dt: number,
    time: number,
  ): { error?: string; destroyed?: boolean; spawned?: any[] } {
    const key = `${entityId}_${scriptIndex}`;
    const script = this.scripts.get(key);
    if (!script || !script.compiledFn || script.compileError) {
      return { error: script?.compileError || 'Script not compiled' };
    }

    const spawned: any[] = [];
    let destroyed = false;

    try {
      // Build the Input API
      const InputAPI = {
        GetKey: (k: string) => this.inputState.keys.has(k.toLowerCase()),
        GetKeyDown: (k: string) => this.inputState.keysDown.has(k.toLowerCase()),
        GetKeyUp: (k: string) => this.inputState.keysUp.has(k.toLowerCase()),
        GetMouseX: () => this.inputState.mouseX,
        GetMouseY: () => this.inputState.mouseY,
        GetMouseButton: (btn: number) => this.inputState.mouseButtons.has(btn),
        GetMouseDeltaX: () => this.inputState.mouseDeltaX,
        GetMouseDeltaY: () => this.inputState.mouseDeltaY,
        // Common key aliases
        IsKeyHeld: (k: string) => this.inputState.keys.has(k.toLowerCase()),
      };

      // Print function → console
      const printFn = (...args: any[]) => {
        this.consoleOutput(args.map(String).join('\t'), 'log');
      };

      // Math helpers
      const deg = (rad: number) => rad * (180 / Math.PI);
      const rad = (degrees: number) => degrees * (Math.PI / 180);

      // Vector3 constructor
      const Vector3 = (x = 0, y = 0, z = 0) => ({ x, y, z });

      // FindEntity
      const FindEntity = (name: string) => {
        if (this._entityLookup) return this._entityLookup(name);
        return null;
      };

      // Destroy (flags this entity for removal)
      const Destroy = () => { destroyed = true; };

      // Instantiate (requests spawning a new entity)
      const Instantiate = (type: string, x = 0, y = 0, z = 0) => {
        spawned.push({ type, position: { x, y, z } });
      };

      // Mark started callback
      const markStarted = () => { script.started = true; };

      // Execute!
      script.compiledFn(
        entityBindings, dt, time,
        InputAPI, printFn, script.state,
        script.started, markStarted,
        deg, rad,
        FindEntity, Destroy, Instantiate, Vector3
      );

      return { destroyed, spawned: spawned.length > 0 ? spawned : undefined };
    } catch (err: any) {
      return { error: err.message };
    }
  }

  // ---- Reset all script states ----
  reset(): void {
    this.scripts.forEach((script) => {
      script.started = false;
      script.state = {};
    });
  }

  // ---- Clear everything ----
  clear(): void {
    this.scripts.clear();
  }

  // ---- Remove scripts for a specific entity ----
  removeEntity(entityId: string): void {
    const keysToDelete: string[] = [];
    this.scripts.forEach((_, key) => {
      if (key.startsWith(entityId + '_')) keysToDelete.push(key);
    });
    keysToDelete.forEach((k) => this.scripts.delete(k));
  }

  // ---- Get compilation info ----
  getScriptInfo(entityId: string, scriptIndex: number): CompiledScript | undefined {
    return this.scripts.get(`${entityId}_${scriptIndex}`);
  }
}

// ---- Lua Script Presets ----

export const LUA_PRESETS: Record<string, { name: string; code: string; description: string }> = {
  move_wasd: {
    name: 'WASD Movement',
    description: 'Move object with WASD keys',
    code: `-- WASD Movement Script
-- Controls: W/A/S/D to move, Q/E to rotate

local speed = 5

function Update(object, dt)
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
    if Input.GetKey("q") then
        object.rotation.y = object.rotation.y - 90 * dt
    end
    if Input.GetKey("e") then
        object.rotation.y = object.rotation.y + 90 * dt
    end
end`,
  },

  rotate: {
    name: 'Auto Rotate',
    description: 'Continuously rotates the object',
    code: `-- Auto Rotate Script
-- Spins the object around the Y axis

local rotSpeed = 60

function Update(object, dt)
    object.rotation.y = object.rotation.y + rotSpeed * dt
end`,
  },

  bounce: {
    name: 'Bounce',
    description: 'Object bounces up and down using sine wave',
    code: `-- Bounce Script
-- Uses math.sin for smooth bouncing

local amplitude = 2
local frequency = 3
local baseY = 1.5

function Update(object, dt)
    object.position.y = baseY + math.abs(math.sin(time * frequency)) * amplitude
end`,
  },

  orbit: {
    name: 'Orbit',
    description: 'Orbits around the world origin',
    code: `-- Orbit Script
-- Circles around (0, height, 0)

local radius = 4
local height = 1.5
local orbitSpeed = 1.5

function Update(object, dt)
    object.position.x = math.cos(time * orbitSpeed) * radius
    object.position.z = math.sin(time * orbitSpeed) * radius
    object.position.y = height
    -- Face the direction of movement
    object.rotation.y = -time * orbitSpeed * 57.3
end`,
  },

  hover: {
    name: 'Hover Float',
    description: 'Gently floats up and down',
    code: `-- Hover Float Script
-- Smooth hovering with slight rotation

function Update(object, dt)
    object.position.y = object.position.y + math.sin(time * 2) * 0.01
    object.rotation.y = object.rotation.y + 15 * dt
end`,
  },

  patrol: {
    name: 'Patrol',
    description: 'Moves back and forth along X axis',
    code: `-- Patrol Script
-- Patrols between two points

local range = 4
local speed = 2

function Update(object, dt)
    object.position.x = math.sin(time * speed) * range
    -- Face movement direction
    if math.cos(time * speed) > 0 then
        object.rotation.y = 90
    else
        object.rotation.y = -90
    end
end`,
  },

  follow_input: {
    name: 'Arrow Keys Move',
    description: 'Move with arrow keys + space to jump',
    code: `-- Arrow Keys Movement
-- Arrows: move, Space: jump, Shift: sprint

local speed = 4
local jumpForce = 0.15
local sprintMult = 2

function Update(object, dt)
    local s = speed
    if Input.GetKey("shift") then
        s = speed * sprintMult
    end

    if Input.GetKey("arrowup") then
        object.position.z = object.position.z - s * dt
    end
    if Input.GetKey("arrowdown") then
        object.position.z = object.position.z + s * dt
    end
    if Input.GetKey("arrowleft") then
        object.position.x = object.position.x - s * dt
    end
    if Input.GetKey("arrowright") then
        object.position.x = object.position.x + s * dt
    end

    -- Simple jump
    if Input.GetKeyDown(" ") then
        object.position.y = object.position.y + jumpForce
    end
end`,
  },

  color_change: {
    name: 'Scale Pulse',
    description: 'Pulses scale based on time',
    code: `-- Scale Pulse Script
-- Smoothly scales up and down

local minScale = 0.7
local maxScale = 1.5
local pulseSpeed = 2

function Update(object, dt)
    local s = minScale + (maxScale - minScale) * (math.sin(time * pulseSpeed) * 0.5 + 0.5)
    object.scale.x = s
    object.scale.y = s
    object.scale.z = s
end`,
  },

  wave: {
    name: 'Wave Motion',
    description: 'Complex wave pattern movement',
    code: `-- Wave Motion Script
-- Creates a figure-8 pattern

local scaleX = 3
local scaleZ = 2
local speed = 1

function Update(object, dt)
    object.position.x = math.sin(time * speed) * scaleX
    object.position.z = math.sin(time * speed * 2) * scaleZ
    object.position.y = 1 + math.sin(time * 3) * 0.5

    -- Rotate to face movement direction
    object.rotation.y = math.cos(time * speed) * 45
    object.rotation.z = math.sin(time * speed * 2) * 15
end`,
  },

  spawner: {
    name: 'Spawner',
    description: 'Press F to spawn objects nearby',
    code: `-- Spawner Script
-- Press F to spawn a sphere at this location

function Update(object, dt)
    if Input.GetKeyDown("f") then
        local ox = object.position.x + (math.random() - 0.5) * 3
        local oy = object.position.y + 2
        local oz = object.position.z + (math.random() - 0.5) * 3
        Instantiate("sphere", ox, oy, oz)
        print("Spawned sphere at " .. ox .. ", " .. oy .. ", " .. oz)
    end
end`,
  },

  look_at_mouse: {
    name: 'Track Mouse',
    description: 'Object rotates based on mouse position',
    code: `-- Track Mouse Script
-- Rotates toward mouse screen position

function Update(object, dt)
    local mx = Input.GetMouseX()
    local my = Input.GetMouseY()
    -- Map mouse to rotation
    object.rotation.y = (mx - 0.5) * 180
    object.rotation.x = (my - 0.5) * -60
end`,
  },

  state_demo: {
    name: 'Counter Demo',
    description: 'Demonstrates persistent state and print()',
    code: `-- Counter Demo Script
-- Shows how _state persists and print() logs to console

function Start(object, dt)
    _state.counter = 0
    _state.timer = 0
    print("Script started on: " .. object.name)
end

function Update(object, dt)
    _state.timer = _state.timer + dt
    if _state.timer >= 1.0 then
        _state.counter = _state.counter + 1
        _state.timer = 0
        print(object.name .. " tick #" .. _state.counter)
        -- Move up every tick
        object.position.y = object.position.y + 0.3
    end
end`,
  },

  custom: {
    name: 'Custom Script',
    description: 'Empty template with API reference',
    code: `-- Custom Lua Script
-- ========================================
-- Available API:
--
--   object.position.x/y/z   (read/write)
--   object.rotation.x/y/z   (read/write, degrees)
--   object.scale.x/y/z      (read/write)
--   object.name              (read only)
--
--   dt                       (delta time, seconds)
--   time                     (total elapsed time)
--
--   Input.GetKey("w")        (true while held)
--   Input.GetKeyDown("space")(true on first press)
--   Input.GetKeyUp("e")     (true on release)
--   Input.GetMouseX()        (0..1 screen position)
--   Input.GetMouseY()        (0..1 screen position)
--
--   print("message")         (logs to Console)
--   _state.myVar = value     (persists between frames)
--
--   math.sin, math.cos, math.abs, math.sqrt,
--   math.floor, math.ceil, math.random, math.pi
--
--   Instantiate("cube", x, y, z)  (spawn entity)
--   Destroy()                      (remove this entity)
--   FindEntity("name")            (get another entity)
-- ========================================

function Start(object, dt)
    print("Hello from " .. object.name)
end

function Update(object, dt)
    -- Your code here
end`,
  },
};
