# AGENTS.md: No Limits (Web Racing Game)

Rules for AI coding agents working in this repo. Read this file first, then the docs in `Docs/`.

## Project

Arcade racing game that runs in the browser on desktop and mobile, installable as a PWA. TypeScript, Three.js and Vite. Working title: "No Limits". It must run on low-end laptops and mid-range phones. Four hero cars and six tracks are the long-term target; the first playable build has one car and one track.

Source of truth:

- `Docs/Full_Development_Plan.md`: scope, cars, tracks, driving model, tiers, economy, roadmap
- `Docs/Project_Structure_and_Design_System.md`: stack, folders, files, data types, UI, fonts, colors, motion

If a request conflicts with these docs, stop and ask. Numbers in the docs are starting values to tune, not fixed rules.

## How to work

1. Do **one task at a time**. Never try to build the whole game in one go.
2. Follow the Setup Order, then the First 4 Weeks plan (Development Plan, section 17).
3. Before coding, state which doc section the task comes from.
4. Create only the files the task needs. Do not add features, folders or npm packages that were not asked for. Ask before adding any dependency outside the allowlist below.
5. You can run commands. Before finishing, run `npm run typecheck`, `npm run lint`, `npm test` and `npm run build`, and fix what fails. You cannot see the browser, so end with a short list of what the user should check at `localhost`.
6. Never hand-author binary art or audio. Use placeholders (Three.js primitives, procedural sounds, free CC0 packs) until real assets exist. Record every third-party asset and its license in `Docs/ASSET_LICENSES.md`.
7. Ask before deleting or renaming existing files.

## Stack

| Layer                | Choice                                                             |
| -------------------- | ------------------------------------------------------------------ |
| Language             | TypeScript, strict mode                                            |
| Rendering            | Three.js (WebGL2)                                                  |
| Build and dev server | Vite                                                               |
| UI                   | HTML and CSS overlay on the canvas, design tokens as CSS variables |
| Audio                | Web Audio API with a thin wrapper                                  |
| Input                | Keyboard, Gamepad API, touch, optional device tilt                 |
| Tests                | Vitest for pure logic                                              |
| Lint and format      | ESLint and Prettier                                                |
| Hosting              | Static host (Cloudflare Pages, GitHub Pages or Netlify)            |
| Offline              | Service worker via `vite-plugin-pwa`                               |

Dependency allowlist: `three`, `vite`, `typescript`, `vitest`, `eslint` and its plugins, `prettier`, `vite-plugin-pwa`. Physics engines, UI frameworks and state libraries are not allowed unless the user asks.

## TypeScript rules

- `strict` on. No `any`. ES modules only. Named exports, no default exports.
- File name equals its main export: `EventBus.ts`, `VehicleModel.ts`, `clamp.ts`.
- PascalCase for classes, types and interfaces. camelCase for functions, variables and fields. UPPER_SNAKE_CASE for constants. Interfaces are named by role (`InputProvider`), not with an `I` prefix.
- **No allocations in the game loop**: no new arrays, objects, strings or closures per frame. No `map`, `filter`, `forEach`, spread or template strings in hot paths. Reuse vectors and quaternions.
- **Fixed timestep for simulation**: 60 Hz with an accumulator. Vehicle, AI and race code never read frame delta time. Rendering interpolates between the last two simulation states.
- Simulation must be deterministic: seeded random number generator, no `Math.random()` and no `Date.now()` inside simulation code.
- Simulation code (`core`, `vehicle`, `ai`, `race`) never imports `three`. It uses plain math types. Only `render`, `environment` and `app` touch Three.js.
- Modules talk through the typed `EventBus`, not direct references.
- Load assets asynchronously with progress reporting. Never block the main thread.
- Dispose geometries, materials and textures when a scene unloads.
- Keep per-frame systems cheap. Time-of-day updates run every 0.25 s with cached values.

## Module dependencies

Modules: `core`, `data`, `input`, `vehicle`, `ai`, `race`, `environment`, `audio`, `render`, `services`, `ui`, `app`.

- `core` and `data` sit at the bottom and import nothing from other modules.
- `input`, `vehicle`, `ai`, `race`, `environment` and `audio` import only `core` and `data`.
- `render` imports `core` and `data` and reads simulation state; the simulation never imports `render`.
- `services` imports `core` and `data`.
- `ui` imports `core`, `data` and `services`. Nothing imports `ui`.
- Only `app` (bootstrap) wires modules together.
- Enforce these with an ESLint import-boundary rule once the module folders exist.

## Folder layout

```
no-limits/
  .github/workflows/     CI and deploy
  Docs/                  design docs and ASSET_LICENSES.md
  Tools/                 Node scripts: asset validators, optimizers
  public/                static files: fonts, models, textures, audio, icons, manifest
    assets/
      cars/<car>/        one folder per car
      tracks/<track>/    one folder per track
  src/
    core/ data/ input/ vehicle/ ai/ race/ environment/
    audio/ render/ services/ ui/ app/
  index.html  package.json  tsconfig.json  vite.config.ts
```

Rules:

- Tests sit beside the code as `*.test.ts`.
- No spaces in names. Folders are lowercase.
- Every car folder and every track folder has the same sub-folders (see Project Structure doc, section 2).

## Naming

| Item            | Pattern                                 | Example                |
| --------------- | --------------------------------------- | ---------------------- |
| Code file       | main export name                        | `CarData.ts`           |
| Model (GLB)     | `kind-name-tier.glb`                    | `car-kaze-high.glb`    |
| Texture         | `name_bc`, `_n`, `_orm`, `_e` (`.ktx2`) | `kaze-body_bc.ktx2`    |
| Audio           | `sfx-`, `mus-`, `amb-` prefix, `.ogg`   | `sfx-nitro-on.ogg`     |
| Data file       | `kind-name.json`                        | `car-kaze.json`        |
| UI icon         | `icon-name.svg`                         | `icon-nitro.svg`       |
| Scene or screen | `purpose-name`                          | `race-coastal-highway` |

Asset file names are lowercase kebab-case.

## Git

- Git LFS for: `.glb .ktx2 .psd .blend .wav .ogg .mp3 .mp4`
- `.gitignore`: `node_modules/ dist/ coverage/ .vite/ .env* *.log .DS_Store`
- Small commits, one task per commit. Message format: `area: short description`.

## Architecture

- Data-driven: `CarData`, `TrackData`, `EventData`, `UpgradeData`, `UiTheme`, `MotionTokens` and `GraphicsTierConfig` are typed config objects, loaded from JSON in `public/assets` or from `src/data`.
- Game state machine: Boot, Menu, Loading, Race, Results.
- Services: Save, Settings, Audio, Graphics, Analytics (off by default).
- Save: versioned JSON in `localStorage` or IndexedDB with migrations. It is not tamper-proof, so do not claim encryption.
- Graphics tiers (Low, Medium, High, plus Auto) are `GraphicsTierConfig` objects: pixel ratio cap, shadows, post-processing, draw distance, particle count, traffic count. Auto picks a tier with a short frame-time probe and drops tiers if FPS stays low.
- Assets are authored at High quality, then derived for lower tiers.
- Use dynamic resolution scaling to protect frame rate before dropping a whole tier.

## UI rules

- Landscape first. Portrait shows a rotate hint on phones. Base artboard 800 x 360 CSS px, scaled with flex and grid. Support 4:3 to 21:9 and use `env(safe-area-inset-*)`.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48 px. Screen margin 16 px plus safe area.
- Touch targets at least 48 px (56 px for primary actions). Key actions in the bottom third on mobile.
- Keyboard and gamepad menu navigation with visible focus rings. Mouse hover states on desktop.
- Menus are plain DOM and CSS, built only from shared components. Build the `#styleguide` page first.
- Animate only `transform`, `opacity` and color. Do not animate layout properties or text size.
- Keep all durations and easing curves in the motion tokens. Respect `prefers-reduced-motion` and an in-game Reduce Motion setting.
- Nothing flashes more than 3 times per second.
- Menus must hold 60 FPS on a low-end device.

### Fonts

- Chakra Petch for display and numbers, Barlow for body and UI. Self-hosted `woff2` subsets with `font-display: swap`.
- Fallbacks: Noto Sans Devanagari, Arabic, JP, KR, SC, loaded only when the language needs them.
- Minimum text size 12 px. HUD text 14 px or larger.
- Use `font-variant-numeric: tabular-nums` for speed, timers and money.

### Colors (dark theme tokens)

| Token                               | Hex                                           |
| ----------------------------------- | --------------------------------------------- |
| bg.base                             | `#0B0E14`                                     |
| surface.1 / .2 / .3                 | `#121722` / `#1A2130` / `#232C3F`             |
| border                              | `#2E394F`                                     |
| text.primary / secondary / disabled | `#F2F5FA` / `#A8B3C7` / `#5C677D`             |
| accent day / dusk / night           | `#3DA5FF` / `#FF8A3D` / `#00E5FF`             |
| success / warning / danger / gems   | `#3DDC84` / `#FFC933` / `#FF4D5E` / `#C084FF` |

- One accent at a time. Never use color alone to convey meaning.
- Text contrast at least 4.5:1.

## Performance budgets

| Metric              | Low        | Medium       | High       |
| ------------------- | ---------- | ------------ | ---------- |
| Target FPS          | 30         | 45 to 60     | 60         |
| Draw calls          | under 100  | under 200    | under 300  |
| Triangles on screen | under 150k | under 300k   | under 600k |
| Texture size (max)  | 1024       | 1024 to 2048 | 2048       |
| Pixel ratio cap     | 1          | 1.5          | 2          |

| Download                          | Budget                                          |
| --------------------------------- | ----------------------------------------------- |
| First load (menu: JS, CSS, fonts) | under 1.5 MB compressed                         |
| One track plus one car            | under 20 MB                                     |
| Whole game, all content           | stream on demand, cache with the service worker |

- Use GLB with meshopt or Draco compression, KTX2 textures, GPU instancing, merged static geometry and object pooling for traffic and particles.
- Never judge performance on your dev machine alone. Check with Chrome DevTools CPU and GPU throttling and on a real mid-range phone.

## Definition of done for a task

- `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` all pass with no warnings.
- Follows the rules above (naming, module boundaries, no per-frame allocations, fixed timestep).
- Includes Vitest tests for pure logic (vehicle model, economy formulas, XP curve, drift score, upgrade costs, save migrations) where it makes sense.
- Ends with a short summary: files created or changed, what to check in the browser, and the suggested next task.

## Out of scope (do not build unless asked)

Real-time multiplayer, open-world map, interactive pedestrians, VR, full mechanical damage, native app wrappers, ads and in-app purchases, a backend server.

## Legal

Real car brand names and badges are trademarked. Use the generic car names in the docs and generic emblems. Do not copy copyrighted game or video audio. Use only fonts and assets with licenses that allow web distribution, and record them in `Docs/ASSET_LICENSES.md`.
