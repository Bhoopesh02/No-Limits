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

## 3. Auto Mode Architecture (Task 11B)

Auto mode is fully implemented via `PerformanceMonitor`, `GraphicsService`, and `SettingsService`. It selects an initial tier with a startup benchmark/probe and continuously adapts during active racing:

### Initial Performance Probe

During startup / boot, `probeInitialTier()` measures frame delta times across sample frames:

- **High Tier (`high`):** Average frame time $\le 17.5\text{ ms}$ ($\ge 57.1\text{ FPS}$).
- **Medium Tier (`medium`):** Average frame time $\le 24.0\text{ ms}$ ($41.6$ to $57.1\text{ FPS}$).
- **Low Tier (`low`):** Average frame time $> 24.0\text{ ms}$ ($< 41.6\text{ FPS}$).

### Runtime Adaptation & Dynamic Resolution

During active racing (`Race` state), `recordFrame(frameDt, isEligibleForAuto)` tracks rolling average frame times via exponential smoothing ($\alpha = 0.05$) with zero heap allocations per frame:

1. **Downgrade Escalation:**
   - If rolling FPS stays below the tier threshold for $5.0$ consecutive seconds:
     - **High Tier Threshold:** $< 55\text{ FPS}$ (target 60 FPS).
     - **Medium Tier Threshold:** $< 45\text{ FPS}$ (target 45–60 FPS).
     - **Low Tier Threshold:** $< 30\text{ FPS}$ (target 30 FPS).
   - If `resolutionScale > 0.65`: Resolution scale drops by $0.1$ step down to the $0.60$ floor.
   - If `resolutionScale \le 0.60`: The graphics tier is downgraded by one tier (High $\to$ Medium, or Medium $\to$ Low), and resolution scale resets to $1.00$ to provide scaling headroom.

2. **Promotion & Upscaling:**
   - Requires $10.0$ consecutive seconds of sustained performance overhead (hysteresis) to prevent flapping or thrashing:
     - **Low Tier Upgrade:** $\ge 48\text{ FPS}$ promotes scale by $+0.1$ up to $1.00$, then upgrades tier to `medium`.
     - **Medium Tier Upgrade:** $\ge 58\text{ FPS}$ promotes scale by $+0.1$ up to $1.00$, then upgrades tier to `high`.

3. **Settings Screen & Persistence:**
   - `SettingsScreen` enables player control over Graphics Quality (`auto`, `high`, `medium`, `low`), dynamic resolution scaling, audio volumes, controls, and accessibility.
   - Preferences persist across sessions via `SettingsService` in `localStorage`.

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
