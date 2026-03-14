# KEVLA Engine — Lua Scripting API Reference

## Overview

KEVLA uses a Lua-inspired scripting language that transpiles to JavaScript and runs in a sandboxed VM. Scripts attach to entities and execute during Play mode.

## Lifecycle Functions

```lua
-- Called once when Play starts
function Start(object, dt)
    print("Entity started: " .. object.name)
end

-- Called every frame during Play
function Update(object, dt)
    object.position.x = object.position.x + 1 * dt
end
```

## Entity API

### Transform

```lua
-- Position
object.position.x = 5.0
object.position.y = object.position.y + dt
local z = object.position.z

-- Rotation (degrees)
object.rotation.x = 0
object.rotation.y = object.rotation.y + 90 * dt
object.rotation.z = 45

-- Scale
object.scale.x = 2.0
object.scale.y = 2.0
object.scale.z = 2.0

-- Name (read-only)
local name = object.name
```

## Input API

### Keyboard

```lua
-- Returns true while key is held down
if Input.GetKey("w") then
    object.position.z = object.position.z - 5 * dt
end

-- Returns true on the frame the key was pressed
if Input.GetKeyDown("space") then
    -- Jump
end

-- Returns true on the frame the key was released
if Input.GetKeyUp("e") then
    -- Stop action
end
```

### Mouse

```lua
-- Mouse position (normalized 0-1)
local mx = Input.GetMouseX()
local my = Input.GetMouseY()

-- Mouse buttons (0=left, 1=middle, 2=right)
if Input.GetMouseButton(0) then
    -- Left click held
end
```

## Math Library

```lua
local angle = math.sin(time) * 2.0
local dist = math.sqrt(x * x + z * z)
local clamped = math.max(0, math.min(1, value))
local r = math.random()  -- 0.0 to 1.0
```

Available: `sin`, `cos`, `tan`, `abs`, `sqrt`, `floor`, `ceil`, `max`, `min`, `random`, `atan2`, `pi`

## Persistent State

```lua
-- _state persists between frames
function Update(object, dt)
    _state.timer = (_state.timer or 0) + dt
    if _state.timer > 2.0 then
        _state.timer = 0
        -- Do something every 2 seconds
    end
end
```

## World Interaction

```lua
-- Spawn a new entity
Instantiate("sphere", 0, 5, 0)

-- Destroy current entity
Destroy()

-- Find another entity by name
local other = FindEntity("Player")

-- Print to console
print("Hello from Lua!")
```

## Built-in Variables

| Variable | Type | Description |
|----------|------|-------------|
| `object` | table | The entity this script is attached to |
| `dt` | number | Delta time since last frame (seconds) |
| `time` | number | Total elapsed time since Play started |
| `_state` | table | Persistent state table (survives between frames) |

## Example Scripts

### WASD Movement

```lua
function Update(object, dt)
    local speed = 5
    if Input.GetKey("w") then object.position.z = object.position.z - speed * dt end
    if Input.GetKey("s") then object.position.z = object.position.z + speed * dt end
    if Input.GetKey("a") then object.position.x = object.position.x - speed * dt end
    if Input.GetKey("d") then object.position.x = object.position.x + speed * dt end
end
```

### Orbit

```lua
function Update(object, dt)
    local radius = 3
    local speed = 2
    _state.angle = (_state.angle or 0) + speed * dt
    object.position.x = math.cos(_state.angle) * radius
    object.position.z = math.sin(_state.angle) * radius
    object.rotation.y = object.rotation.y + 90 * dt
end
```
