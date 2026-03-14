# KEVLA Engine — Time-Travel Debugging Guide

## Overview

Time-Travel Debugging allows you to record, rewind, and inspect every frame of your game during Play mode. This is a feature unique to KEVLA — Unity and Unreal do not provide this capability.

## How It Works

### Recording
When you press **Play**, the Temporal Engine automatically records a snapshot of every entity's state each frame:
- Position, rotation, scale
- Velocity, angular velocity
- Physics state (sleeping, forces, contacts)
- Script variables
- Active/inactive status

### Delta Compression
To minimize memory usage, the system uses a keyframe + delta approach:

```
Frame 0:  [KEYFRAME] — Full state of all entities
Frame 1:  [DELTA]    — Only properties that changed from frame 0
Frame 2:  [DELTA]    — Only properties that changed from frame 1
...
Frame 30: [KEYFRAME] — Another full state snapshot
Frame 31: [DELTA]    — Changes from frame 30
```

This typically achieves 3-30× compression depending on scene activity.

### Reconstruction
When you scrub to frame N:
1. Find the nearest keyframe at or before N
2. Apply all deltas forward from that keyframe to N
3. Cache the result for instant re-access

## Usage

### Basic Scrubbing
1. Press **Play** to start recording
2. Let the game run for a few seconds
3. Press **Pause** (⏸)
4. Drag the **timeline slider** left/right to scrub through recorded frames
5. The viewport updates in real-time to show the state at each frame

### Frame Stepping
- Press **`<`** to step one frame backward
- Press **`>`** to step one frame forward
- Press **Home** to jump to the first frame
- Press **End** to jump to the last frame

### Ghost Rendering
- Click the **👻 ghost button** in the toolbar to enable ghost rendering
- Transparent copies of entities appear showing their positions at nearby frames
- Solid ghosts = past positions
- Wireframe ghosts = future positions

### Frame Inspector
- Click the **ℹ info button** to open the Frame Inspector panel
- Shows complete state of every entity at the current frame
- Displays: position, velocity, sleeping status, active contacts, script errors

### Frame Comparison
1. Click the **fork button** to enter comparison mode
2. Click a point on the timeline — marked as **Frame A** (purple)
3. Click another point — marked as **Frame B** (cyan)
4. A diff panel shows all differences between the two frames
5. Entries color-coded: blue = modified, green = added, red = removed

### Waveform Minimap
Above the main scrubber, a waveform visualization shows:
- **Activity** (A) — Overall movement and change level per frame
- **Contacts** (C) — Number of active collision contacts
- **Energy** (E) — Total physics energy in the scene

Click the mode buttons to switch between visualizations.

## Performance

| Metric | Typical Value |
|--------|---------------|
| Memory per frame (10 entities) | ~200-800 bytes (with compression) |
| Max frames stored | 7,200 (2 minutes at 60fps) |
| Reconstruction time | < 1ms (cached) |
| Recording overhead | < 0.1ms per frame |
| Compression ratio | 3-30× depending on scene activity |

## Configuration

| Setting | Default | Range | Description |
|---------|---------|-------|-------------|
| `maxFrames` | 7200 | 600-36000 | Maximum frames in ring buffer |
| `keyframeInterval` | 30 | 1-300 | Frames between full keyframes |
| `ghostCount` | 5 | 1-20 | Number of ghost entities to render |
| `memoryBudgetMB` | 64 | 16-512 | Maximum memory for temporal data |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Space` | Play/Pause |
| `<` | Step backward |
| `>` | Step forward |
| `Home` | Jump to start |
| `End` | Jump to end |
| `Ctrl+Shift+I` | Toggle Frame Inspector |
| `Ctrl+M` | Add bookmark at current frame |
| `Ctrl+B` | Fork timeline branch |
