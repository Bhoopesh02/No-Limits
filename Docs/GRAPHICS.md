# Graphics Tiers and Performance

This document describes the graphics tier architecture, configuration parameters, runtime application rules, performance budgets, and the planned automatic adaptation mode for "No Limits".

---

## 1. Graphics Tier Settings

Graphics configurations are defined in `src/data/GraphicsTierConfig.ts` as typed immutable config objects:

| Setting                  | Low            | Medium         | High                         |
| ------------------------ | -------------- | -------------- | ---------------------------- |
| **Pixel Ratio Cap**      | 1.0            | 1.5            | 2.0                          |
| **Shadow Mode**          | Blob under car | One shadow map | One shadow map, soft         |
| **Shadow Map Type**      | `none`         | `pcf`          | `pcfSoft`                    |
| **Shadow Map Size**      | 0 (blob)       | 1024 texels    | 2048 texels                  |
| **Camera Far Plane**     | 500 m          | 900 m          | 1600 m                       |
| **Scene Fog (Near/Far)** | 120 m / 450 m  | 200 m / 800 m  | 350 m / 1500 m               |
| **Resolution Scale Min** | 0.6            | 0.6            | 0.6                          |
| **AI Opponent Count**    | 3 opponents    | 5 opponents    | 5 opponents                  |
| **Max Ambient Traffic**  | 2 cars         | 4 cars         | 6 cars                       |
| **Particle Scale**       | 25%            | 60%            | 100%                         |
| **Post-Processing**      | None           | Bloom (light)  | Bloom, motion blur, vignette |

---

## 2. Live vs. Next Race Application

To maintain 60 FPS without frame drops, visual pop, or tearing during active racing, settings are partitioned into immediate (live) and deferred (next race build) pipelines:

### Applies Immediately (Live)

- **Pixel ratio and resolution scale:** `TierApplier` computes effective DPR via `getEffectivePixelRatio()` and immediately updates `renderer.webglRenderer.setPixelRatio()` and viewport dimensions.
- **Draw distance and fog:** `camera.far`, `scene.fog.near`, and `scene.fog.far` update immediately.
- **Shadow maps:** Directional shadow map enables/disables immediately, adjusts map dimensions (1024 or 2048), updates shadow camera frustum, and recompiles scene materials once via scene traversal.
- **Blob shadows:** On Low tier, procedural blob shadow planes become visible beneath all active cars; on Medium and High tiers, blob shadows are hidden.
- **Parked car view:** If the game is in `Menu`, `Results`, or `Boot` state, the parked car's 3D mesh is rebuilt in-place immediately (`CarView.setDetail()`) when the tier changes.

### Applies at Next Race Build (`RaceSession`)

- **Player car geometry detail:** Swapping body shell, wheels, interior, and brake detail occurs when constructing a new `RaceSession` to prevent mid-race hitching.
- **Opponent count:** Grid allocation, AI driver instances, and standings buffers are preallocated for `tier.maxOpponents` (3 or 5 opponents, 4 or 6 cars) upon session creation. Zero heap allocations occur per step during racing.

---

## 3. Planned Auto Mode (Task 11B)

Auto mode runs a short frame-time probe during the initial launch and continuously evaluates rolling average frame time during active gameplay. If average frame rate remains below the target threshold (e.g. < 45 FPS on Medium or < 30 FPS on Low) for 5 consecutive seconds, resolution scale drops progressively (from 1.0 down to a floor of 0.6) before downgrading to the next lower graphics tier. Conversely, sustained performance overhead triggers upscale and tier promotion.

---

## 4. Performance Budgets (from AGENTS.md)

Hardware performance envelopes must be respected at all times:

| Metric              | Low      | Medium       | High     |
| ------------------- | -------- | ------------ | -------- |
| **Target FPS**      | 30 FPS   | 45 to 60 FPS | 60 FPS   |
| **Draw Calls**      | < 100    | < 200        | < 300    |
| **Triangles**       | < 150k   | < 300k       | < 600k   |
| **Texture Size**    | Max 1024 | 1024 to 2048 | Max 2048 |
| **Pixel Ratio Cap** | 1.0      | 1.5          | 2.0      |

### Network and Memory Download Budgets

- **First load (Menu: JS, CSS, fonts):** under 1.5 MB compressed.
- **One track plus one car:** under 20 MB.
- **Whole game, all content:** streamed on demand, cached with service worker.
