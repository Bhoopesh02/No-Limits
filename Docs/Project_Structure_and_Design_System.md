Mobile Car Game: Project Structure and Design System
Draft, October 17, 2026
1. Programming Language Decision
Decision: C# for the game, HLSL for shaders, TypeScript for the backend and Python for tools.
Layer
Language
Why
Gameplay, UI, editor tools (Unity)
C#
Native to Unity, strongly typed, good async support, Burst and Jobs for hot code, the biggest pool of tutorials and assets
Shaders
HLSL (Shader Graph plus hand-written URP shaders)
Car paint, glass, wet roads and sky need custom shaders
Backend functions
TypeScript (Firebase Cloud Functions)
Quick to start and familiar to web developers. Handles receipts, leaderboards and replay checks
Build and asset tools
Python
Blender export scripts, asset validators, CI helpers
Native plugins (only if needed)
Kotlin (Android) and Swift (iOS)
Thin plugins for thermal state, haptics and store features
Options considered
Option
Verdict
C++ with Unreal
Great visuals, but heavier builds, a higher minimum device and slower iteration for a first mobile racer
GDScript with Godot
Light and friendly, but fewer racing assets, tools and mobile profiling options
Kotlin and Swift (native)
Two codebases and no engine tools for 3D, physics or lighting
JavaScript with Three.js
Fine for web demos, but cannot match native performance for detailed cars and four graphics tiers
Rust with Bevy
Promising, but mobile tooling and asset pipeline are still immature
C# with Unity
Chosen: best balance of mobile performance, tools, assets and learning resources
C# coding rules
One public class per file, and the file name equals the class name
PascalCase for types and methods, camelCase for fields, an underscore prefix for private fields (_speed)
Namespaces mirror folders: CarGame.Vehicle, CarGame.AI, CarGame.UI
One assembly definition per module
No allocations in Update: no LINQ, no string concatenation, no new lists per frame
ScriptableObjects for data, events for communication between modules, interfaces at module borders
Async or coroutines for loading, never blocking calls on the main thread
Optional: UniTask for allocation-free async
2. Folder Structure
Repository
CarGame/  .github/workflows/      CI builds and tests  Docs/                   design docs, art bible, style guide  Tools/    blender/              export and LOD scripts (Python)    validators/           asset and naming checks (Python)    build/                build and release scripts  Backend/    functions/src/        Cloud Functions (TypeScript)  Unity/    Assets/      _Project/           everything you make      ThirdParty/         asset store packs and plugins    Packages/    ProjectSettings/  .gitignore  .gitattributes          Git LFS rules  README.md
Unity project (Assets/_Project)
_Project/  Art/    Cars/      Lamborghini/        Models, Textures, Materials, Prefabs, Animations      Bugatti/      Supra/      BMW_M4/      Shared/             wheels, tires, glass, lights, decals    Tracks/      CoastalCityHighway/ Chunks, Lightmaps, Materials, Splines, Props      NeonDowntown/      MountainSerpentine/      DesertCanyon/      ForestRally/      AirportRunwayLoop/    Environment/          Buildings, Props, Vegetation, Roads, Decals, Skyboxes    VFX/                  Particles, Trails, Weather, Nitro    Shaders/              CarPaint, Glass, Road, Water, Sky, UI    UI/      Sprites/            Icons, Backgrounds, Frames      Atlases/      Fonts/              source files and TextMeshPro font assets  Audio/    Music/  SFX/  Ambience/  FMOD/  Data/    Cars/  Tracks/  Events/  Upgrades/  Economy/    TimeOfDay/  GraphicsTiers/  UITheme/  Prefabs/    Core/  Race/  UI/  Traffic/  Scenes/    Boot/  MainMenu/  Garage/  Race/  Debug/  StyleGuide/  Scripts/    Core/  Services/  Vehicle/  AI/  Race/    Environment/  Input/  UI/  Data/  Editor/  Settings/    URP/                  Mobile_Low, Mobile_Med, Mobile_High, Mobile_Max    Volumes/              post-processing profiles per tier and time of day    Quality/  Localization/  Plugins/    Android/  iOS/  Tests/    EditMode/  PlayMode/
Folder rules
Everything you create lives in _Project, so imported packs never mix with your files.
No spaces in names, and PascalCase for folders.
One folder per car and per track, with the same sub-folders in each.
Do not use Resources folders. Load content through Addressables, grouped by car, track and tier.
Git setup
Git LFS for: .fbx, .blend, .png, .jpg, .tga, .psd, .exr, .wav, .ogg, .mp3, .mp4, .ttf, .otf, .bank
.gitignore for: Library/, Temp/, Obj/, Build/, Builds/, Logs/, UserSettings/, .vs/, .idea/, *.csproj, *.sln
Naming conventions
Asset
Prefix or suffix
Example
Static mesh
SM_
SM_Supra_Body
Skeletal mesh
SK_
SK_Traffic_Bus
Texture
T_ with _BC (base color), _N (normal), _ORM (occlusion, roughness, metallic), _E (emissive)
T_Supra_Body_BC
Material
M_
M_CarPaint_Supra
Shader
SH_
SH_CarPaint
Prefab
Car_, Track_, UI_ plus name and tier
Car_Supra_Max
Animation
A_
A_Supra_DoorOpen
Audio
SFX_, MUS_, AMB_
SFX_Nitro_On
ScriptableObject
Type name plus name
CarData_Supra
UI sprite
UI_
UI_Icon_Nitro
Scene
Purpose_Name
Race_CoastalCityHighway
3. File Structure
Scripts (C#)
Scripts/  Core/    GameBootstrap.cs  GameStateMachine.cs  EventBus.cs    ServiceLocator.cs  SceneLoader.cs  Services/    SaveService.cs  CloudSaveService.cs  AudioService.cs    GraphicsService.cs  AdsService.cs  IapService.cs    AnalyticsService.cs  RemoteConfigService.cs  Vehicle/    CarController.cs  Engine.cs  Gearbox.cs  Drivetrain.cs    Suspension.cs  WheelTire.cs  Aerodynamics.cs  NitroSystem.cs    DriftScorer.cs  CarDamage.cs  CarLights.cs  CarAudio.cs    CarVisuals.cs  CarFactory.cs  AI/    RacerAI.cs  RacingLine.cs  DifficultyProfile.cs    TrafficManager.cs  TrafficCar.cs  Race/    RaceManager.cs  Checkpoint.cs  LapCounter.cs    ResultsCalculator.cs  ReplayRecorder.cs  GhostPlayer.cs    Rules/ CircuitRace.cs  SprintRace.cs  TimeTrial.cs           DriftChallenge.cs  Elimination.cs  Environment/    TimeOfDayManager.cs  NightFactor.cs  WeatherManager.cs    WindowLightController.cs  StreetLamp.cs    TunnelTrigger.cs  ChunkStreamer.cs  Input/    InputManager.cs  TiltInput.cs  TouchControls.cs  ControllerInput.cs  UI/    UIManager.cs  UIThemeApplier.cs  UIAnimator.cs    Screens/ MainMenuScreen.cs  TrackSelectScreen.cs  GarageScreen.cs             RaceSetupScreen.cs  ResultsScreen.cs  SettingsScreen.cs  ShopScreen.cs    HUD/ Speedometer.cs  Tachometer.cs  NitroBar.cs         Minimap.cs  PositionLap.cs  Countdown.cs    Components/ AppButton.cs  StatBar.cs  CurrencyPill.cs                StarRating.cs  TierCard.cs  ToastView.cs  Data/    CarData.cs  TrackData.cs  EventData.cs  UpgradeData.cs    EconomyConfig.cs  TimeOfDayProfile.cs  GraphicsTierConfig.cs    UIThemeData.cs  UIMotionData.cs  Editor/    CarSetupWizard.cs  TrackValidator.cs    TierBuildPostprocessor.cs  NamingValidator.cs
Assembly definitions and dependency rules
Assemblies: CarGame.Core, .Services, .Vehicle, .AI, .Race, .Environment, .Input, .UI, .Data, .Editor and .Tests
Core and Data sit at the bottom and depend on nothing
Vehicle, AI, Race and Environment depend only on Core and Data
UI depends on Core and Data, and nothing depends on UI
Modules talk to each other through the EventBus, not direct references
Backend files (TypeScript)
Backend/functions/src/  index.ts  auth/createProfile.ts  purchases/verifyReceipt.ts  leaderboard/submitScore.ts  getLeaderboard.ts  replay/validateReplay.ts  events/liveEvents.ts  config/economy.json
Data file formats
ScriptableObjects for design data: cars, tracks, events, upgrades, themes and graphics tiers
JSON for save files (encrypted, with a version number for migrations) and for remote config such as economy and live events
4. Design System
Principles
Readable at speed: big numbers, few words, high contrast
Thumb-first: key actions in the bottom third, large touch targets
Premium automotive: dark surfaces, sharp angles, glowing accents
Consistent: every screen is built from the same components and tokens
Quiet while racing: the HUD shows only what the player needs
Foundations
Token
Value
Orientation
Landscape for menus and racing
Design artboard
800 × 360 dp
Unity Canvas Scaler
Scale With Screen Size, reference 2400 × 1080, match height (1 dp = 3 canvas units)
Spacing scale
4, 8, 12, 16, 24, 32, 48 dp
Screen margin
16 dp plus the device safe area
Shapes
8 dp chamfered corners on cards, an 8° slant on primary buttons and tags, 4 dp radius on inputs
Elevation
Surface colors and accent glow, no drop shadows
Borders
1 dp border color, 2 dp accent for selected or focused
Touch targets
48 dp minimum, 56 dp for primary actions
Icons
24 dp grid, 2 dp stroke, sharp corners
Component library
Component
Spec
States
Primary button
56 dp high, slanted, accent fill, dark uppercase text
Default, pressed, disabled, loading
Secondary button
48 dp high, accent outline and text
Default, pressed, disabled
Text button
40 dp high, no fill
Default, pressed
Icon button
48 × 48 dp with a 24 dp icon
Default, pressed, disabled
Car card
240 × 150 dp, 3D render, name, 3 stat pips, price or Owned badge
Selected, locked, owned
Track card
280 × 160 dp, image, name, length, stars, best time
Locked, new, selected
Stat bar
8 dp high, accent fill, green preview segment for upgrades
Base, preview
Currency pill
40 dp high, icon, amount, plus button
Normal, gaining
Toggle
56 × 32 dp
On, off, disabled
Slider
6 dp track, 24 dp thumb
Default, dragging
Segmented control
4 segments, 48 dp high (graphics tiers)
Selected, unselected
Bottom navigation
64 dp high, 4 items
Active, inactive
Modal
Max 560 dp wide, Surface 2, chamfered, 60% dim behind
Open, closing
Toast
56 dp high, top of screen, dismisses after 3 s
Info, success, warning, error
Chip
40 dp high (time and weather picker)
Selected, unselected
Star rating
3 stars at 32 dp
Empty, filled
Badge
24 dp high (New, Owned, Locked)
Fixed
HUD rules
Speed uses the largest text on screen, and the HUD shows at most 6 elements while racing.
Opacity is 85%. Players can scale the HUD from 50% to 150% and hide any element.
The HUD dims automatically at night, and respects safe areas and rounded corners.
Workflow
Design in Figma with the same tokens, and export sprites with 9-slice borders.
Store tokens in a UIThemeData ScriptableObject.
Build one StyleGuide scene that shows every component in every state, and review changes there before building screens.
Accessibility
Contrast of at least 4.5:1 for text and 3:1 for large text and UI shapes
Never convey meaning with color alone
Scalable text, a haptics toggle, a Reduce Motion setting and a left-handed layout
5. Font System
Font choices
Role
Font
Weights
License
Display and numbers
Chakra Petch
Medium, SemiBold, Bold
SIL Open Font License
Body and UI text
Barlow
Regular, Medium, SemiBold
SIL Open Font License
Hindi fallback
Noto Sans Devanagari
Regular, Bold
SIL Open Font License
Arabic fallback
Noto Sans Arabic
Regular, Bold
SIL Open Font License
Japanese, Korean, Chinese fallback
Noto Sans JP, KR and SC
Regular, Bold
SIL Open Font License
All are free Google Fonts. Read the license file that comes with each download before shipping.
Type scale
Style
Font
Size
Line height
Use
Display XL
Chakra Petch Bold
48 dp
1.0
HUD speed
Display L
Chakra Petch Bold
36 dp
1.0
Countdown, big rewards
H1
Chakra Petch SemiBold
28 dp
1.1
Screen titles
H2
Chakra Petch SemiBold
22 dp
1.15
Section titles
H3
Chakra Petch Medium
18 dp
1.2
Card titles
Body L
Barlow Medium
16 dp
1.3
Key information
Body
Barlow Regular
14 dp
1.4
Descriptions
Caption
Barlow Medium
12 dp
1.3
Labels and hints
Button
Chakra Petch SemiBold
14 dp, uppercase, +4% letter spacing
1.0
All buttons
HUD numeric
Chakra Petch Medium
18–24 dp
1.0
Lap, timer, position
Rules
Minimum text size is 12 dp, and HUD text is 14 dp or larger.
Two families only. Use uppercase only for buttons and short labels.
Use TextMeshPro mspace for speed, timers and money so digits do not jitter.
Keep body text to about 45–60 characters per line and 2 lines on cards.
Translated text can be 30–40% longer, so leave room and use auto-size with a minimum size.
Unity setup
TextMeshPro SDF font assets, named like FA_ChakraPetch_Bold_SDF, stored in Art/UI/Fonts/ChakraPetch/.
A static 1024 × 1024 atlas for ASCII and Latin-1, and dynamic atlases for other scripts to save memory.
Fallback chain: Chakra Petch, then Barlow, then the Noto fonts for the player's language.
6. Color System
Core palette (dark theme)
Token
Hex
Use
bg.base
#0B0E14
Screen background
surface.1
#121722
Cards and panels
surface.2
#1A2130
Modals and raised panels
surface.3
#232C3F
Inputs, bars and tracks
border
#2E394F
Dividers and outlines
text.primary
#F2F5FA
Main text
text.secondary
#A8B3C7
Supporting text
text.disabled
#5C677D
Disabled text and icons
Accent by time of day
Time
Hex
Mood
Day
#3DA5FF
Sky blue
Dusk and dawn
#FF8A3D
Warm orange
Night
#00E5FF
Neon cyan
Semantic and game colors
Token
Hex
Use
success
#3DDC84
Confirmations, gains
warning
#FFC933
Cautions, cash, stars
danger
#FF4D5E
Errors, wrong way, destructive actions
gems
#C084FF
Premium currency
nitro
#7FD4FF to #2F6BFF
Nitro bar and flames (gradient)
1st, 2nd, 3rd
#FFC933, #C9D1DC, #D98A4E
Podium and position badges
Contrast check (on bg.base, approximate)
Color
Ratio
text.primary
about 19:1
text.secondary
about 9:1
Night accent
about 12.5:1
Dusk accent
about 8:1
Day accent
about 7.5:1
success
about 11:1
danger
about 6:1
Dark text (bg.base) on an accent fill gives the same ratios, so buttons stay readable.
Rules
Follow a 60/30/10 split: 60% background and surfaces, 30% text and neutrals, 10% accent.
Use one accent at a time, only for the main action, the active state and key numbers.
Use danger red only for warnings and destructive actions.
Colorblind mode swaps success and danger for blue (#3DA5FF) and orange (#FF8A3D), and every status also gets an icon or number.
Test with the Android developer option Simulate color space and iOS Color Filters.
Time-of-day theming
Menus use the accent for the selected time (Day, Dusk or Night).
The race HUD blends the accent using the night factor and dusk factor from the time-of-day system, over about 2 seconds, so it never flips suddenly.
Theme asset
[CreateAssetMenu(menuName = "Game/UI Theme")]public class UIThemeData : ScriptableObject{    public Color bgBase, surface1, surface2, surface3, border;    public Color textPrimary, textSecondary, textDisabled;    public Color accentDay, accentDusk, accentNight;    public Color success, warning, danger, gems;    public Color GetAccent(float nightFactor, float duskFactor)    {        Color c = Color.Lerp(accentDay, accentNight, nightFactor);        return Color.Lerp(c, accentDusk, duskFactor);    }}
7. UI Animations
Principles
Fast: most animations take 100–300 ms and never block input
Purposeful: show state changes, guide attention and reward success
Consistent: use the same motion tokens everywhere
Optional: a Reduce Motion setting turns off non-essential motion
Safe: nothing flashes more than 3 times per second
Motion tokens
Token
Value
Use
instant
100 ms
Press feedback
fast
150 ms
Small state changes
base
250 ms
Elements, modals, toasts
slow
400 ms
Screen transitions, stat bars
hero
600–800 ms
Rewards and count-ups
Easing
Curve
Unity equivalent
Enter
cubic-bezier(0.16, 1, 0.3, 1)
OutExpo
Exit
cubic-bezier(0.7, 0, 0.84, 0)
InExpo
Move
cubic-bezier(0.65, 0, 0.35, 1)
InOutCubic
Pop
Spring with about 8% overshoot
OutBack
Animation catalog
Element
Animation
Time
Button press
Scale to 0.96, glow brightens, haptic tick, springs back on release
100 ms
Screen transition
New screen slides in 5% from the right and fades in, and the old one fades out
250–400 ms
Modal
Scales from 0.92 to 1 and fades in, background dims to 60%
200 ms
Toast
Slides down 24 dp, holds 3 s, fades out
250 ms in, 200 ms out
Tab or nav change
Indicator slides, icon pops to 1.1
200 ms
List and card entrance
Fade and slide 12 dp with a 40 ms stagger, up to 8 items
250 ms
Currency count-up
Number rolls up with ease-out and the pill pulses
600–800 ms
Stat bar change
Fill animates to the new value with a green flash on increase
400 ms
Upgrade purchase
Car glow pulse and sparkle, stat bars update
600 ms
Star reveal
Stars pop one by one with a small particle burst
200 ms each
Race countdown
3, 2, 1 scale from 1.4 to 1 and fade, GO flashes once
800 ms per step
Speedometer
Smoothed with a critically damped spring (smooth time 0.08 s), no tween
Continuous
Tachometer redline
Color shifts to danger above 92% RPM, with a slow 2 Hz pulse
Continuous
Nitro activation
FOV +8°, speed lines, blue edge vignette, radial blur on High and Max
150 ms in, 400 ms out
Position change
Number flips with an arrow and a short green or red flash
300 ms
Lap complete
Banner slides in from the left, holds 1.5 s, slides out right
250 ms
Wrong-way warning
Danger banner flashes at 2 Hz until fixed
Continuous
Accent change at dusk or dawn
Accent color blends smoothly
2 s
Garage turntable
Drag with inertia, slow idle camera drift
Continuous
Paint swatch change
Cross-fade with a small sparkle
300 ms
Daily reward claim
Card flips and coins burst
600 ms
Loading
Logo pulse, progress bar, tips fade every 4 s
Continuous
Implementation
Use DOTween (the free version is enough) for code tweens, and the Animator or Timeline for longer sequences such as the results screen. Rive or Lottie are optional for animated icons.
Animate only Transform, CanvasGroup alpha and Image color or fill. Avoid animating layout groups or text size because they trigger rebuilds.
Keep every duration and curve in a UIMotionData ScriptableObject so you can tune them globally.
Reduce Motion disables shakes, speed lines, parallax and flashes, and swaps slides for fades.
UI particle caps: Low 20, Medium 50, High 100, Max 200. No full-screen blur on Low and Medium, use a simple dim instead.
Menus must hold 60 FPS on the Low-tier reference device.
8. Setup Order
Create the repository, folder layout and Git LFS rules
Create the assembly definitions
Create the UIThemeData and UIMotionData assets with the tokens above
Import the fonts, generate the TextMeshPro SDF assets and set the fallback chain
Build the StyleGuide scene with every component in every state
Implement the core animations: press, screen transition and count-up
Build the real screens from components only
Add the naming validator and the smoke tests to CI