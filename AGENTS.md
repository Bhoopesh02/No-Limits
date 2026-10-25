# AGENTS.md: Mobile Car Game

Rules for AI coding agents working in this repo. Read this file first, then the docs in `Docs/`.

## Project

Arcade-sim mobile racing game (Android and iOS). Unity with URP. Four hero cars (Lamborghini, Bugatti, Supra, BMW M4), six tracks, four graphics tiers (Low, Medium, High, Max), automatic day/night.

Source of truth:
- `Docs/Full_Development_Plan.md`: scope, tiers, cars, tracks, physics, economy, roadmap
- `Docs/Project_Structure_and_Design_System.md`: languages, folders, files, UI, fonts, colors, animation

If a request conflicts with these docs, stop and ask. Numbers in the docs are starting values to tune, not fixed rules.

## How to work

1. Do **one task at a time**. Never try to build the whole game in one go.
2. Follow the Setup Order, then the First 4 Weeks plan (Development Plan, section 25).
3. Before coding, state which doc section the task comes from.
4. Create only the files the task needs. Do not add features, packages or folders that were not asked for.
5. You cannot run Unity. After each task, list what the user should test in the editor, and expect compile errors to be pasted back.
6. Never create or edit binary art, audio or `.meta` conflicts by hand. Use placeholders (Unity primitives, free packs) until real assets exist.
7. Ask before deleting or renaming existing files.

## Languages

| Layer | Language |
| --- | --- |
| Gameplay, UI, editor tools | C# (Unity) |
| Shaders | HLSL (Shader Graph and hand-written URP shaders) |
| Backend | TypeScript (Firebase Cloud Functions) |
| Build and asset tools | Python |
| Native plugins (only if needed) | Kotlin (Android), Swift (iOS) |

## C# rules

- One public class per file. File name equals class name.
- PascalCase for types and methods, camelCase for fields, underscore prefix for private fields (`_speed`).
- Namespaces mirror folders: `CarGame.Vehicle`, `CarGame.AI`, `CarGame.UI`.
- One assembly definition per module.
- **No allocations in `Update`**: no LINQ, no string concatenation, no new lists per frame.
- ScriptableObjects for data, events for communication between modules, interfaces at module borders.
- Use async or coroutines for loading. Never block the main thread.
- No `Resources` folders. Load content through Addressables.
- Vehicle code uses a fixed timestep only (no frame delta time) so replays stay deterministic.
- Keep per-frame systems cheap. Time-of-day updates run every 0.25 s with cached values.

## Assembly dependencies

Assemblies: `CarGame.Core`, `.Services`, `.Vehicle`, `.AI`, `.Race`, `.Environment`, `.Input`, `.UI`, `.Data`, `.Editor`, `.Tests`.

- `Core` and `Data` sit at the bottom and depend on nothing.
- `Vehicle`, `AI`, `Race` and `Environment` depend only on `Core` and `Data`.
- `UI` depends on `Core` and `Data`. Nothing depends on `UI`.
- Modules talk through the `EventBus`, not direct references.

## Folder layout

```
CarGame/
  .github/workflows/     CI
  Docs/                  design docs
  Tools/                 blender/, validators/, build/ (Python)
  Backend/functions/src/ Cloud Functions (TypeScript)
  Unity/
    Assets/
      _Project/          everything we make
      ThirdParty/        asset packs and plugins
```

Inside `Assets/_Project/`: `Art/`, `Audio/`, `Data/`, `Prefabs/`, `Scenes/`, `Scripts/`, `Settings/`, `Localization/`, `Plugins/`, `Tests/`.

Scripts live in `Scripts/` under: `Core`, `Services`, `Vehicle`, `AI`, `Race`, `Environment`, `Input`, `UI`, `Data`, `Editor`.

Rules:
- Everything we create goes in `_Project`. Third-party content goes in `ThirdParty`.
- No spaces in names. PascalCase folders.
- One folder per car and per track, with identical sub-folders.

## Naming

| Asset | Pattern | Example |
| --- | --- | --- |
| Static mesh | `SM_` | `SM_Supra_Body` |
| Skeletal mesh | `SK_` | `SK_Traffic_Bus` |
| Texture | `T_` plus `_BC`, `_N`, `_ORM`, `_E` | `T_Supra_Body_BC` |
| Material | `M_` | `M_CarPaint_Supra` |
| Shader | `SH_` | `SH_CarPaint` |
| Prefab | `Car_`, `Track_`, `UI_` plus name and tier | `Car_Supra_Max` |
| Animation | `A_` | `A_Supra_DoorOpen` |
| Audio | `SFX_`, `MUS_`, `AMB_` | `SFX_Nitro_On` |
| ScriptableObject | Type name plus name | `CarData_Supra` |
| UI sprite | `UI_` | `UI_Icon_Nitro` |
| Scene | `Purpose_Name` | `Race_CoastalCityHighway` |

## Git

- Git LFS for: `.fbx .blend .png .jpg .tga .psd .exr .wav .ogg .mp3 .mp4 .ttf .otf .bank`
- `.gitignore`: `Library/ Temp/ Obj/ Build/ Builds/ Logs/ UserSettings/ .vs/ .idea/ *.csproj *.sln`
- Small commits, one task per commit. Message format: `area: short description`.

## Architecture

- Data-driven: `CarData`, `TrackData`, `EventData`, `UpgradeData`, `UIThemeData`, `UIMotionData`, `GraphicsTierConfig` are ScriptableObjects.
- Game state machine: Boot, Menu, Loading, Race, Results.
- Services: Save, Audio, Graphics, Ads, IAP, Analytics, RemoteConfig.
- Save files: encrypted JSON with a version number for migrations.
- Each graphics tier is a Unity Quality Level pointing to its own URP asset (`Mobile_Low`, `Mobile_Med`, `Mobile_High`, `Mobile_Max`).
- Use shader keywords (`TIER_LOW`, `TIER_MED`) instead of separate shaders per tier.
- Assets are authored at Max quality, then derived for lower tiers.

## UI rules

- Landscape. Design artboard 800 x 360 dp. Canvas Scaler: Scale With Screen Size, reference 2400 x 1080, match height.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48 dp. Screen margin 16 dp plus safe area.
- Touch targets at least 48 dp (56 dp for primary actions). Key actions in the bottom third.
- Use uGUI with TextMeshPro and sprite atlases.
- Screens are built only from shared components. Build the `StyleGuide` scene first.
- Animate only Transform, CanvasGroup alpha and Image color or fill. Avoid animating layout groups or text size.
- Keep all durations and curves in `UIMotionData`. Support a Reduce Motion setting.
- Nothing flashes more than 3 times per second.
- Menus must hold 60 FPS on the Low-tier reference device.

### Fonts

- Chakra Petch for display and numbers, Barlow for body and UI.
- Fallbacks: Noto Sans Devanagari, Arabic, JP, KR, SC.
- Minimum text size 12 dp. HUD text 14 dp or larger.
- Use TextMeshPro `mspace` for speed, timers and money.

### Colors (dark theme tokens)

| Token | Hex |
| --- | --- |
| bg.base | `#0B0E14` |
| surface.1 / .2 / .3 | `#121722` / `#1A2130` / `#232C3F` |
| border | `#2E394F` |
| text.primary / secondary / disabled | `#F2F5FA` / `#A8B3C7` / `#5C677D` |
| accent day / dusk / night | `#3DA5FF` / `#FF8A3D` / `#00E5FF` |
| success / warning / danger / gems | `#3DDC84` / `#FFC933` / `#FF4D5E` / `#C084FF` |

- One accent at a time. Never use color alone to convey meaning.
- Text contrast at least 4.5:1.

## Performance budgets (per tier)

| Metric | Low | Medium | High | Max |
| --- | --- | --- | --- | --- |
| Target FPS | 30 | 30 to 45 | 60 | 60 |
| Draw calls | under 150 | under 250 | under 400 | under 600 |
| Memory | under 800 MB | under 1.2 GB | under 1.8 GB | under 2.5 GB |

- Base install under about 200 MB. HD and Ultra packs download on demand.
- Use object pooling for traffic and particles, GPU instancing, SRP Batcher, ASTC textures.
- Never judge performance in the editor alone. Real-device profiling is required.

## Definition of done for a task

- Compiles with no errors or warnings.
- Follows the rules above (naming, namespaces, assembly dependencies, no per-frame allocations).
- Includes EditMode tests for pure logic (economy formulas, XP curve, drift score, upgrade costs) where it makes sense.
- Ends with a short summary: files created or changed, what to test in Unity, and the suggested next task.

## Out of scope (do not build unless asked)

Real-time multiplayer, open-world map, interactive pedestrians, VR, full mechanical damage.

## Legal

Lamborghini, Bugatti, Toyota and BMW names and badges are trademarked. Use generic emblems unless licenses are held. Do not copy copyrighted game or video audio.
