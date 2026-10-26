# No Limits: Full Development Plan (Web)

Draft for the browser version. All numbers are starting values to tune.

## 1. Vision and scope

An arcade racing game that opens instantly in a browser, plays well on a low-end laptop or phone, and looks good on a strong PC. Short races, satisfying drifts and nitro, four collectible cars, six tracks, and an automatic day and night cycle.

**In scope:** single-player racing, AI opponents, light traffic, car upgrades, offline play, installable PWA.

**Out of scope:** real-time multiplayer, open world, pedestrians, VR, mechanical damage, native apps, ads and in-app purchases, a backend. These can come later.

## 2. Platforms and hardware targets

| Target           | Minimum                                                        | Goal                              |
| ---------------- | -------------------------------------------------------------- | --------------------------------- |
| Desktop browser  | Chrome, Edge, Firefox, Safari with WebGL2, integrated graphics | 60 FPS on High                    |
| Android browser  | Chrome, about 3 GB RAM, mid-range GPU                          | 30 FPS on Low, 45 to 60 on Medium |
| iPhone and iPad  | Safari with WebGL2                                             | 60 FPS on Medium                  |
| Developer laptop | Any low-end laptop                                             | `npm run dev` stays responsive    |

The developer laptop is a hard constraint: no heavy editors, no engine installs, no large local builds. Everything must build with Node.js and run from a dev server.

## 3. Tech stack and why

TypeScript, Three.js, Vite, plain HTML and CSS for UI, Web Audio, Vitest. See the Structure doc, section 1, for the options considered.

- Three.js is mature, small when tree-shaken, and has the best glTF tooling.
- A custom arcade vehicle model on a fixed timestep keeps the game deterministic, cheap and easy to test, with no physics engine to download.
- DOM and CSS for menus keeps the UI crisp, accessible and light.

## 4. Game design

**Core loop:** pick a car and track, race, earn coins, upgrade, unlock the next car or track.

**Modes:**

- Quick Race (first build)
- Time Trial with a ghost car
- Career: a list of events with star goals (later)

**Race rules (starting):** 3 laps, 5 opponents, checkpoints in order, rubber-banding kept subtle. A lap counts only after all checkpoints are passed.

**Mechanics:** drift for score, nitro that fills from drifting and slipstreaming, off-road slowdown, soft barrier collisions that lose speed but never wreck the car.

## 5. Cars

Four generic archetypes (no real brand names):

| Car   | Archetype                | Top speed km/h | 0 to 100 km/h | Handling | Nitro |
| ----- | ------------------------ | -------------- | ------------- | -------- | ----- |
| Vanta | Italian-style supercar   | 340            | 2.9 s         | 7        | 6     |
| Aurum | Luxury hypercar          | 400            | 2.5 s         | 6        | 8     |
| Kaze  | Japanese sports coupe    | 290            | 4.1 s         | 9        | 7     |
| Falke | German performance coupe | 305            | 3.6 s         | 8        | 6     |

First build ships **one car (Kaze)**, then the rest. Each car is a `CarData` object plus a GLB model at three detail levels (Low, Medium, High) and a few paint colors.

Upgrades: engine, tires, nitro, weight. Five levels each. Upgrade cost = `baseCost × 1.35^level`. Upgrades change `CarData` stats with a cap so no car overpowers the others.

## 6. Tracks

Six tracks, built from a **spline** (a list of control points) that generates the road mesh, checkpoints, AI racing line and barriers:

| Track                | Setting                              | Length target |
| -------------------- | ------------------------------------ | ------------- |
| Coastal City Highway | Sunny coast, tunnels, long straights | 2.5 km        |
| Neon Downtown        | Wet streets, neon signs, tight turns | 2.0 km        |
| Mountain Serpentine  | Hairpins, cliffs, fog                | 3.0 km        |
| Desert Canyon        | Open curves, rock arches, dust       | 2.8 km        |
| Forest Rally         | Dirt, trees, mud patches             | 2.4 km        |
| Airport Runway Loop  | Wide, flat, high speed               | 2.2 km        |

First build ships **Coastal City Highway** only. Tracks are `TrackData` JSON plus a GLB for scenery. Background scenery is low-poly and instanced; the road is generated in code.

## 7. Driving model

Arcade, not a simulator. Runs at a fixed 60 Hz step. State per car: position, heading, speed, lateral slip, steering angle, nitro, drift charge.

Update order each step:

1. Read input (throttle, brake, steer, handbrake, nitro).
2. Apply engine force from a torque curve, limited by top speed and drag.
3. Apply braking.
4. Steer with a bicycle model; steering reduces with speed.
5. Compute lateral grip. When slip exceeds the grip limit, the car drifts: sideways velocity decays slowly and drift score grows.
6. Apply nitro boost with a cooldown.
7. Resolve track limits against the spline (barriers and off-road).
8. Write the new state.

Starting parameters (per car, in `CarData`): mass, engine power curve, drag, grip, grip loss in drift, steering max angle, steering speed falloff, nitro strength and duration, reverse top speed, and reverse acceleration.

Reverse driving rules:
- Reverse is derived without modifying `InputState`: when `brake > 0`, `throttle == 0` and forward speed <= 1 m/s, the car accelerates backward using `CarData.reverseAccel` capped at `CarData.reverseTopSpeed`. Otherwise, brake slows the car down to 0.
- Speed is signed (positive forward, negative backward). If the car is moving backward and `throttle > 0`, braking force applies first, crossing zero into forward acceleration.
- Steering uses signed speed so front wheels turn the chassis in reverse orientation; steering falloff is based on `abs(speed)`.
- Nitro cannot ignite while speed < 0, and drift charge and drift score do not accumulate in reverse.
- `VehicleState.isReversing` boolean is computed every simulation step with zero heap allocations.

Drift score = `slipAngle × speed × dt`, with a multiplier that rises for each second a drift is held and resets when it ends.

Vehicle code must be pure and deterministic so it can be unit-tested in Node and used for ghost replays.

## 8. Camera and controls

**Cameras:** chase (default), hood, far chase. The camera smooths with a spring and widens field of view with speed.

**Controls:**

| Device   | Controls                                                            |
| -------- | ------------------------------------------------------------------- |
| Keyboard | Arrows or WASD, Space for handbrake, Shift for nitro, Esc for pause |
| Gamepad  | Left stick or triggers, face buttons for handbrake and nitro        |
| Touch    | On-screen steering, throttle, brake and nitro buttons, sized 56 px  |
| Tilt     | Optional steering by phone tilt, after a permission prompt on iOS   |

All devices implement one `InputProvider` interface that returns a plain `InputState`, so vehicle code never knows which device is used.

## 9. AI and traffic

**Opponents:** follow a precomputed racing line on the spline with per-car speed targets. Add slight randomness (seeded) to lines and braking points. Rubber-banding changes target speed by at most 8%.

**Traffic:** pooled cars on highway tracks only, moving at fixed speeds in lanes. Close passes add a small nitro bonus. Keep traffic count within the tier budget.

## 10. Day, night and weather

Time of day runs automatically over a race or a session and shifts sun angle, sky color, fog, headlights, street lights and the UI accent (day, dusk, night). Updates run every 0.25 s with cached values. Weather (rain on Neon Downtown) is a later addition and must degrade cleanly on Low.

## 11. Graphics tiers and performance

Three tiers plus Auto, defined as `GraphicsTierConfig` (budgets in AGENTS.md):

| Setting               | Low            | Medium         | High                         |
| --------------------- | -------------- | -------------- | ---------------------------- |
| Pixel ratio cap       | 1              | 1.5            | 2                            |
| Shadows               | Blob under car | One shadow map | One shadow map, soft         |
| Post-processing       | None           | Bloom, light   | Bloom, motion blur, vignette |
| Draw distance         | Short          | Medium         | Long                         |
| Traffic and opponents | 2 and 3        | 4 and 5        | 6 and 5                      |
| Particles             | 25%            | 60%            | 100%                         |

Auto runs a short frame-time probe at first launch and re-checks during play. If FPS stays under the tier target for 5 seconds, resolution scale drops first, then the tier drops.

## 12. Audio

Web Audio API. Engine sound uses a few looping samples crossfaded by RPM, with pitch tied to speed. Tire squeal on drift, nitro whoosh, UI clicks, and music with a simple crossfade between menu and race. Audio starts only after the first user gesture because browsers require it. Use Ogg Vorbis and keep the total under about 5 MB at launch.

## 13. Progression and economy

Starting values:

- Race reward = `baseReward × positionMultiplier` (1st 1.0, 2nd 0.7, 3rd 0.5, others 0.3).
- XP to next level = `100 × level^1.5`.
- Unlocks: tracks by player level, cars by coins.
- Upgrade cost = `baseCost × 1.35^level`.

All formulas live in one module with Vitest tests. There is no real-money store in this version.

## 14. Save and settings

A `SaveService` stores versioned JSON in `localStorage` (small data) or IndexedDB (replays and ghosts). Every save has a `version` field and a migration function per version. Settings: graphics tier, resolution scale, volume sliders, control scheme, language, Reduce Motion, units (km/h or mph). Saves are not encrypted or tamper-proof.

## 15. Asset pipeline

- Models: GLB, compressed with meshopt or Draco. Author at High, derive Medium and Low with fewer triangles and smaller textures.
- Textures: KTX2 (Basis) where possible, otherwise WebP. Max 2048.
- Audio: Ogg Vorbis.
- Placeholders first: Three.js boxes for cars, procedural road, simple sky.
- Sources: free CC0 packs (for example from Kenney or Quaternius) for low-poly props and cars. Every asset gets a row in `Docs/ASSET_LICENSES.md` with source, author and license.
- A Node script in `Tools/` validates file names, sizes and triangle counts against the budgets.

## 16. Testing, CI and deploy

- **Unit tests (Vitest):** vehicle model, drift score, economy, XP, upgrade costs, save migrations, spline math, checkpoint logic.
- **Manual checks:** the browser checklist at the end of each task.
- **CI (GitHub Actions):** install, typecheck, lint, test, build on every push.
- **Deploy:** the `dist/` folder goes to a static host. Free tiers on Cloudflare Pages, GitHub Pages or Netlify work for this size; check the current limits before launch.
- **Performance checks:** Chrome DevTools throttling, and a real mid-range phone before each milestone.

## 17. Roadmap

### Setup Order

1. Install Node.js LTS, Git and VS Code. Create the repo.
2. Scaffold Vite with TypeScript (strict), Three.js, Vitest, ESLint and Prettier.
3. Create the module folders and the import-boundary lint rule.
4. Add the CI workflow and deploy an empty page to a free static host.
5. Add `GameInfo` config, `EventBus` and the fixed-timestep game loop with tests.
6. Build the `#styleguide` page: tokens, fonts and shared UI components.

### First 4 Weeks

**Week 1:** Setup Order complete. Flat ground, a box car, keyboard input through `InputProvider`, chase camera, speed readout.

**Week 2:** Vehicle model with tests (acceleration, steering, drift, nitro). Gamepad and touch input. Spline track with generated road mesh and barriers. Lap timer.

**Week 3:** Checkpoints, race state machine (Boot, Menu, Loading, Race, Results), one AI opponent on the racing line, loading screen, settings screen, graphics tiers with Auto.

**Week 4:** First real car model (Kaze, three detail levels), scenery for Coastal City Highway, day and night on that track, engine and tire audio, save system, PWA install, public deploy of a playable build.

### After week 4

Garage and upgrades, three more cars, five more tracks, traffic, Time Trial and ghosts, Career events, weather, localization, performance pass on real phones.

## 18. Risks

| Risk                            | Mitigation                                                            |
| ------------------------------- | --------------------------------------------------------------------- |
| Slow phones                     | Tiers, dynamic resolution, strict budgets, early real-device tests    |
| Large downloads                 | Compressed assets, stream per track, service worker cache             |
| iOS Safari audio and tilt rules | Start audio on first tap, request tilt permission with a clear button |
| Car feel is hard to get right   | Tunable `CarData`, unit tests, a debug panel with live sliders        |
| Asset licensing                 | CC0 first, license log for everything                                 |
| Scope growth                    | One car and one track first, one task at a time                       |

## 19. Open decisions

- Final game name and domain (check availability before launch).
- Which free static host to use.
- Whether to add WebGPU later (not needed for the first build).
- Whether a backend (leaderboards) is worth adding after launch.
