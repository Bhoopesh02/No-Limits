# No Limits: Project Structure and Design System (Web)

Draft for the browser version.

## 1. Language and stack decision

**Decision: TypeScript for everything, Three.js for 3D, plain HTML and CSS for UI, Node scripts for tools.**

| Layer                | Choice                          | Why                                             |
| -------------------- | ------------------------------- | ----------------------------------------------- |
| Game, UI, tools      | TypeScript (strict)             | One language, type safety, large ecosystem      |
| 3D rendering         | Three.js                        | Mature, tree-shakeable, strong glTF support     |
| Build and dev server | Vite                            | Fast start and rebuilds, light on a weak laptop |
| UI                   | HTML and CSS with CSS variables | Crisp text, accessible, cheap to render         |
| Audio                | Web Audio API                   | Built in, no download                           |
| Tests                | Vitest                          | Same config as Vite, runs in Node               |
| Asset tools          | Node scripts                    | No extra language to install                    |

### Options considered

| Option                 | Verdict                                                                    |
| ---------------------- | -------------------------------------------------------------------------- |
| Unity                  | Heavy editor and builds; the developer laptop cannot run it well. Dropped. |
| Unreal                 | Even heavier. Not suited to a web target.                                  |
| Godot with web export  | Light editor, but web builds are large and browser support has limits      |
| Babylon.js             | Strong engine, but larger bundle and fewer small examples for this style   |
| PlayCanvas             | Good, but editor is cloud-based and ties the project to its platform       |
| Phaser                 | 2D only                                                                    |
| **Three.js with Vite** | **Chosen: smallest download, full control, runs on any laptop**            |

## 2. Repository structure

```
no-limits/
  AGENTS.md
  .github/workflows/
    ci.yml                  typecheck, lint, test, build
    deploy.yml              publish dist/ to the static host
  Docs/
    Full_Development_Plan.md
    Project_Structure_and_Design_System.md
    ASSET_LICENSES.md
  Tools/
    validateAssets.mjs      checks names, sizes, triangle counts
    optimizeModels.mjs      meshopt and texture conversion helper
  public/
    manifest.webmanifest
    icons/
    fonts/                  woff2 subsets
    assets/
      cars/<car>/           model/ textures/ audio/ data/
      tracks/<track>/       model/ textures/ audio/ data/
      shared/               sky/ props/ sfx/ music/ ui/
  src/
    core/
    data/
    input/
    vehicle/
    ai/
    race/
    environment/
    audio/
    render/
    services/
    ui/
    app/
    main.ts
  index.html
  package.json
  tsconfig.json
  vite.config.ts
  eslint.config.js
  .prettierrc
  .gitignore
  .gitattributes
```

Every `cars/<car>/` and `tracks/<track>/` folder has the same sub-folders: `model`, `textures`, `audio`, `data`.

## 3. Modules and key files

| Module        | Key files                                                                                                                      | Purpose                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| `core`        | `EventBus.ts`, `GameLoop.ts`, `Rng.ts`, `Vec2.ts`, `Vec3.ts`, `math.ts`, `StateMachine.ts`                                     | Fixed-timestep loop, events, seeded random numbers, math types |
| `data`        | `GameInfo.ts`, `CarData.ts`, `TrackData.ts`, `UpgradeData.ts`, `GraphicsTierConfig.ts`, `UiTheme.ts`, `MotionTokens.ts`        | Types and loaders for config                                   |
| `input`       | `InputProvider.ts`, `InputState.ts`, `KeyboardInput.ts`, `GamepadInput.ts`, `TouchInput.ts`, `TiltInput.ts`, `InputManager.ts` | One input interface, many devices                              |
| `vehicle`     | `VehicleState.ts`, `VehicleModel.ts`, `DriftScore.ts`, `Nitro.ts`                                                              | Pure, deterministic car simulation                             |
| `ai`          | `RacingLine.ts`, `AiDriver.ts`, `TrafficSystem.ts`                                                                             | Opponents and traffic                                          |
| `race`        | `RaceController.ts`, `Checkpoints.ts`, `LapTimer.ts`, `Standings.ts`, `Spline.ts`                                              | Race rules and track math                                      |
| `environment` | `TimeOfDay.ts`, `WeatherState.ts`                                                                                              | Produces sun, sky and fog values (no rendering)                |
| `audio`       | `AudioEngine.ts`, `EngineSound.ts`, `Mixer.ts`                                                                                 | Web Audio wrapper                                              |
| `render`      | `Renderer.ts`, `CameraRig.ts`, `CarView.ts`, `TrackView.ts`, `SkyView.ts`, `TierApplier.ts`, `AssetLoader.ts`                  | Three.js scene, reads simulation state                         |
| `services`    | `SaveService.ts`, `SettingsService.ts`, `GraphicsService.ts`, `AnalyticsService.ts`                                            | Persistence and settings                                       |
| `ui`          | `ScreenManager.ts`, `screens/`, `components/`, `styles/`                                                                       | DOM screens and components                                     |
| `app`         | `App.ts`, `bootstrap.ts`                                                                                                       | Creates and connects everything                                |

### Dependency rules

- `core` and `data` import nothing from other modules.
- `input`, `vehicle`, `ai`, `race`, `environment` and `audio` import only `core` and `data`.
- `render` imports `core` and `data`. The simulation never imports `render`.
- `services` imports `core` and `data`.
- `ui` imports `core`, `data` and `services`. Nothing imports `ui`.
- `app` is the only place that wires modules together.
- Simulation modules (`core`, `vehicle`, `ai`, `race`) never import `three`.

## 4. Coding rules

- TypeScript `strict`, no `any`, ES modules, named exports only.
- File name equals main export name.
- PascalCase types and classes, camelCase functions and fields, UPPER_SNAKE_CASE constants.
- No allocations in the game loop; reuse objects.
- Fixed 60 Hz simulation; render interpolates.
- Deterministic simulation: seeded `Rng`, no `Math.random()` or `Date.now()` inside it.
- Communication through a typed `EventBus`.
- Async asset loading with progress. Dispose Three.js resources on unload.

## 5. Data model

Starting shapes (fields can grow with the plan):

```ts
export interface CarData {
  id: string; // "kaze"
  displayName: string;
  mass: number; // kg
  topSpeed: number; // m/s
  reverseTopSpeed: number; // m/s
  reverseAccel: number; // m/s^2
  powerCurve: readonly number[]; // normalized torque by speed bucket
  drag: number;
  grip: number;
  driftGripFactor: number; // grip multiplier while drifting
  maxSteerAngle: number; // radians
  steerSpeedFalloff: number;
  nitroStrength: number;
  nitroDuration: number; // seconds
  nitroCooldown: number; // seconds
  models: { low: string; medium: string; high: string };
  paints: readonly string[]; // hex colors
}

export interface TrackData {
  id: string;
  displayName: string;
  lengthMeters: number;
  laps: number;
  controlPoints: readonly { x: number; y: number; z: number; width: number }[];
  checkpointCount: number;
  scenery: string; // GLB path
  timeOfDayStart: number; // 0 to 24
}

export interface GraphicsTierConfig {
  id: 'low' | 'medium' | 'high';
  pixelRatioCap: number;
  shadows: 'blob' | 'map' | 'softMap';
  postProcessing: readonly string[];
  drawDistance: number;
  maxTraffic: number;
  maxOpponents: number;
  particleScale: number; // 0 to 1
}

export interface InputState {
  steer: number; // -1 to 1
  throttle: number; // 0 to 1
  brake: number; // 0 to 1
  handbrake: boolean;
  nitro: boolean;
  pause: boolean;
}
```

`GameInfo` holds `displayName` ("No Limits"), `shortName`, `version` and the app id in one place; all UI and manifest text read from it.

## 6. Rendering architecture

- The simulation produces a `VehicleState` per car each fixed step.
- `render` keeps the previous and current state and interpolates by the leftover time fraction, so motion is smooth at any display rate.
- One `Renderer` owns the Three.js `WebGLRenderer`, scene and camera rig.
- `TierApplier` changes pixel ratio, shadows, post-processing and draw distance from a `GraphicsTierConfig`. Use shader defines or material variants instead of separate shader files per tier.
- The road mesh is generated from the track spline; scenery comes from a GLB, with repeated props drawn through `InstancedMesh`.
- Static scenery is merged where possible to cut draw calls.

## 7. UI architecture

- The canvas fills the page. A DOM overlay sits on top for HUD, menus and dialogs.
- `ScreenManager` shows one screen at a time and listens to the game state machine.
- Screens are built only from shared components (section 10). Build the `#styleguide` page first and check every component there.

### Screens

| Screen       | Purpose                                            |
| ------------ | -------------------------------------------------- |
| Boot         | Logo, asset check, first-gesture prompt for audio  |
| Main Menu    | Play, Garage, Settings                             |
| Track Select | Track cards with best time and stars               |
| Garage       | Car view, stats, paint, upgrades                   |
| Loading      | Progress bar and a tip                             |
| HUD          | Speed, lap, position, nitro, minimap, drift score  |
| Pause        | Resume, Restart, Settings, Quit                    |
| Results      | Position, times, rewards, Next                     |
| Settings     | Graphics, audio, controls, language, accessibility |
| Rotate Hint  | Phones in portrait                                 |

## 8. Design tokens

All values live in `src/ui/styles/tokens.css` as CSS variables, with a typed copy in `UiTheme.ts` for code that needs them.

```css
:root {
  /* colors (dark theme) */
  --bg-base: #0b0e14;
  --surface-1: #121722;
  --surface-2: #1a2130;
  --surface-3: #232c3f;
  --border: #2e394f;
  --text-primary: #f2f5fa;
  --text-secondary: #a8b3c7;
  --text-disabled: #5c677d;
  --accent: #3da5ff; /* day; dusk #FF8A3D; night #00E5FF */
  --success: #3ddc84;
  --warning: #ffc933;
  --danger: #ff4d5e;
  --gems: #c084ff;

  /* spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;

  /* radius and elevation */
  --radius-s: 6px;
  --radius-m: 12px;
  --radius-l: 20px;
  --elev-1: 0 2px 6px rgba(0, 0, 0, 0.35);
  --elev-2: 0 8px 24px rgba(0, 0, 0, 0.45);

  /* type scale */
  --fs-12: 12px;
  --fs-14: 14px;
  --fs-16: 16px;
  --fs-20: 20px;
  --fs-24: 24px;
  --fs-32: 32px;
  --fs-48: 48px;

  /* motion */
  --dur-fast: 120ms;
  --dur-base: 200ms;
  --dur-slow: 320ms;
  --ease-out: cubic-bezier(0.2, 0.8, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
}
```

- One accent at a time. The accent changes with the time of day.
- Text contrast at least 4.5:1. Never use color alone to carry meaning; pair it with an icon or label.
- Safe-area padding uses `env(safe-area-inset-*)` plus a 16 px screen margin.

## 9. Fonts

- **Chakra Petch** for display text and numbers, **Barlow** for body and UI.
- Self-host `woff2` subsets in `public/fonts/` with `font-display: swap`. Both are open-licensed; log them in `ASSET_LICENSES.md`.
- Fallback stacks: `system-ui, sans-serif`. Load Noto Sans for Devanagari, Arabic, JP, KR and SC only when the chosen language needs it.
- Minimum text size 12 px. HUD text 14 px or larger.
- Speed, timers and money use `font-variant-numeric: tabular-nums` so digits do not jump.

## 10. Component library

Build each once, with every state, on the `#styleguide` page.

| Component                                                                  | States                                     |
| -------------------------------------------------------------------------- | ------------------------------------------ |
| Button (primary, secondary, ghost, icon)                                   | default, hover, focus, pressed, disabled   |
| Card (car card, track card)                                                | default, selected, locked                  |
| Stat bar                                                                   | normal, upgraded                           |
| Toggle and slider                                                          | default, focus, disabled                   |
| Dropdown and tabs                                                          | default, open, focus                       |
| Modal and toast                                                            | enter, idle, exit                          |
| Progress bar                                                               | determinate, indeterminate                 |
| HUD widgets (speedometer, nitro gauge, lap badge, position badge, minimap) | normal, warning                            |
| Focus ring                                                                 | visible on keyboard and gamepad navigation |

Rules:

- Touch targets at least 48 px, primary actions 56 px.
- Menus work with keyboard arrows and Enter, gamepad d-pad and A, mouse hover and click, and touch.

## 11. Animation and motion

- Animate only `transform`, `opacity` and color. Never animate layout properties, `box-shadow` size or text size.
- Durations and easings come from the motion tokens. `MotionTokens.ts` mirrors them for scripted animation.
- Respect `prefers-reduced-motion` and an in-game Reduce Motion setting: replace movement with simple fades.
- Nothing flashes more than 3 times per second.
- Screen transitions use a short fade plus a small slide. HUD number changes do not animate layout.

## 12. Responsive layout and input

- Landscape first. Base artboard 800 x 360 CSS px; the layout stretches with flex and grid between 4:3 and 21:9.
- Phones in portrait show the Rotate Hint screen.
- HUD anchors to screen corners and respects safe areas.
- Mobile shows touch controls; desktop hides them. The player can switch control scheme in Settings.
- Show the correct button prompts (keyboard, Xbox or PlayStation style) for the last-used device.

## 13. Accessibility

- Text contrast at least 4.5:1.
- All interactive elements are reachable by keyboard and have visible focus.
- Buttons and toggles have labels for screen readers; HUD values use `aria-live` sparingly.
- Options: Reduce Motion, larger HUD text, color-blind safe palette for track markers, steering sensitivity, and speed units.
- No flashing content above the 3 flashes per second limit.

## 14. Asset specifications

| Asset         | Spec                                                             |
| ------------- | ---------------------------------------------------------------- |
| Car model     | GLB, meshopt compressed. Triangles: Low 8k, Medium 20k, High 45k |
| Track scenery | GLB, instanced props, merged static geometry                     |
| Textures      | KTX2 where possible, otherwise WebP. Max 2048, Low tier max 1024 |
| Audio         | Ogg Vorbis, mono for effects, stereo for music                   |
| Icons         | SVG, single color, 24 px grid                                    |
| Fonts         | woff2 subsets                                                    |

`Tools/validateAssets.mjs` checks these limits and the naming rules in AGENTS.md.

## 15. Tooling and scripts

`package.json` scripts:

| Script            | Purpose                                    |
| ----------------- | ------------------------------------------ |
| `dev`             | Start the Vite dev server                  |
| `build`           | Type check and build to `dist/`            |
| `preview`         | Serve the built game locally               |
| `typecheck`       | `tsc --noEmit`                             |
| `lint`            | ESLint, including the import-boundary rule |
| `test`            | Vitest run                                 |
| `validate:assets` | Run the asset validator                    |

Setup Order and the First 4 Weeks plan are in the Development Plan, section 17.
