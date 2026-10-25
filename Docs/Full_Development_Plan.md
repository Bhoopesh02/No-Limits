Mobile Car Game: Full Development Plan
Draft plan, October 17, 2026
1. Concept and Scope
Genre: Arcade-sim racing (realistic look, forgiving handling)
Modes: Career, Quick Race, Time Trial, Free Roam, later Online PvP
Engine: Unity with URP (best mobile performance and tooling). Unreal also works, but builds are heavier.
Tools: Blender for models, Substance Painter for textures, FMOD for audio, Firebase or PlayFab for backend
Legal note: Lamborghini, Bugatti, Toyota Supra and BMW M4 are trademarked. For a portfolio or learning project this is fine. For a public release you need licenses, or you must use "inspired-by" cars with different names.
2. Graphics Tiers
Setting
Low
Medium
High
Max
Target device
2–3 GB RAM
4 GB mid-range
6 GB+
Latest flagships
FPS
30
30–45
60
60 (90/120 optional)
Resolution scale
60%
75%
90%
100%
Car textures
512
1K
2K
4K
Car triangles
~15k
~30k
~60k
100k+
Shadows
Blob only
Car only
2 cascades
4 cascades + contact
Reflections
Static cubemap
Baked probes
Live probe on car
Planar on wet roads + SSR
Anti-aliasing
None
FXAA
MSAA 2x
MSAA 4x / TAA
Post-processing
None
Bloom, tonemap
+ motion blur, grading
+ SSAO, DOF, lens flare
Draw distance
150 m
250 m
400 m
600 m
Traffic
5
10
20
30
Weather
None
Day/night only
+ rain
+ fog, puddles, wet roads
Damage
None
Scratches
Dents
Dents + loose parts
Add an Auto-detect option that picks a tier on first launch and lowers it if FPS drops.
3. Scenarios by Graphics Setting
Example level: Coastal City Highway. Every tier uses the same layout and gameplay, so only the visuals change.
Low
Simple box buildings with painted-on windows
Billboard trees and a gradient skybox
Fully baked lighting, with night lights as emissive textures only
Tire smoke as a simple sprite
Medium
Modeled building fronts and baked ambient occlusion
Basic road markings, guardrails and a sea plane
Street lamps with fake light cones
Dust and smoke particles
High
Detailed buildings with signs, AC units and balconies
3D trees that sway, plus grass and roadside props
Real-time sun shadows and rain with splashes
Headlight beams that light the road
Max
Fully dressed city with traffic lights, pedestrians on sidewalks and animated billboards
Wet asphalt that reflects neon and headlights
Volumetric fog, god rays at sunrise, a rippling sea with foam, and heat haze
Sparks, tire marks and a cockpit with working 3D gauges
4. Cars
Car
Style
Character
Lamborghini
Huracán or Revuelto style
Top speed and grip, but twitchy. Open-V10 sound.
Bugatti
Chiron style
Highest top speed and acceleration. Heavy, so it takes wide turns.
Supra
A90 style
Balanced, and the best for tuning and drifting.
BMW M4
G82 style
Strong cornering and braking. Best all-rounder.
Detail for every car
4 LOD levels per car, with LOD0 used in the showroom and replays
Separate meshes for doors, wheels, brake calipers, spoilers and lights
Interior with working steering wheel, dashboard and gauges (Max)
PBR materials: car paint with clearcoat, carbon fiber, glass, chrome
Working brake lights, indicators and headlights
Suspension animation, wheel spin, brake discs that glow
Customization: paint, wraps, rims, spoilers, underglow, performance upgrades
5. Day/Night Auto Switch
A 24-hour game clock. Default is 1 in-game day per 24 real minutes, with options for faster or slower.
Phases: Dawn 5–7, Day 7–17, Dusk 17–19, Night 19–5.
The sun rotates by time of day. Sky color, fog, ambient light and sun intensity follow curves.
Headlights switch on automatically at dusk. Street lamps, building windows and neon signs turn on at night.
Stars and a moon appear at night.
Race setup lets the player pick Auto, Fixed Day, or Fixed Night.
Cost per graphics tier
Low: blends between two baked light sets
Medium: adds blended reflection probes
High: real-time sun with baked probes
Max: fully dynamic, with reflection probes re-captured as the sun moves
6. Driving Physics and Controls
Wheel colliders with custom tire grip curves, drift and traction models, and per-car weight and power
Controls: tilt, on-screen buttons, or virtual wheel
Assists: auto brake, ABS, traction control, plus manual or auto gears
Camera: chase, hood, cockpit and bumper, with speed-based FOV and shake
Full controller support
7. Game Modes and Progression
Career: race events, unlock tracks and cars, boss races
Economy: soft currency (cash) and premium currency (gems)
Garage: buy, upgrade, tune, paint
Daily rewards, missions and leaderboards
Later: online PvP, ghost races, clubs, seasonal events
8. UI/UX
Main menu with a 3D showroom, a garage with turntable view, and a photo mode
HUD: speedometer, tachometer, gear, minimap, nitro bar, lap and position
Clean, thumb-friendly layout
Full settings screen for graphics, audio and controls
9. Audio
Engine sounds with RPM layers and a distinct tone per car
Turbo whistle, exhaust pops, tire squeal, wind and collision sounds
Dynamic music that intensifies with speed
Separate sliders for music, SFX and engine
10. Optimization (critical for mobile)
GPU instancing and static/dynamic batching
Occlusion culling and texture atlasing
Object pooling for traffic and particles
Addressables for streaming assets, and ASTC texture compression
Thermal throttling check that lowers quality if the phone overheats
Install size under about 200 MB, with extra packs downloaded later
11. Backend and Monetization
Login (Google/Apple), cloud save, leaderboards and analytics
Revenue options: rewarded ads, cosmetic IAP, premium car packs, a battle pass. Avoid pay-to-win.
12. Roadmap
Pre-production (2–3 weeks): design doc, art style, tech tests
Prototype (4–6 weeks): one car, one test road, basic physics and controls
Vertical slice (6–8 weeks): one polished track, 4 graphics tiers, day/night, 1 hero car
Production (3–5 months): all 4 cars, 4–6 tracks, UI, audio, career mode
Alpha/Beta (6–8 weeks): device testing, balancing, bug fixing
Soft launch in a small region, then global release
Live ops: new cars, tracks, events and seasonal updates
A solo developer should budget roughly 12–18 months. A small team of 4–6 could do it in 6–9.
13. Risks
Car models: high-detail cars take the most time. Buy or commission base models if you're solo.
Device fragmentation: test on at least 5–10 real devices across tiers.
Scope creep: ship with fewer tracks first, then expand.
Part 2: Detailed Specifications
The sections below expand Part 1 with build-ready numbers, pipelines and checklists. Treat every number as a starting value to tune during playtests.
14. Graphics Tier Deep Dive
14.1 Unity URP settings per tier
Setting
Low
Medium
High
Max
URP asset
Mobile_Low
Mobile_Med
Mobile_High
Mobile_Max
Render scale
0.6
0.75
0.9
1.0
HDR
Off
Off
On
On
Anti-aliasing
Off
FXAA
MSAA 2x
MSAA 4x or TAA
Shadow distance
0 (blob)
30 m
60 m
100 m
Shadow map size
n/a
512
1024
2048
Cascades
0
1
2
4
Soft shadows
Off
Off
On
On
Extra lights per object
0
2
4
8
Anisotropic filtering
Off
2x
4x
16x
Texture mip limit
Half-res
Half env, full cars
Full
Full
LOD bias
0.7
1.0
1.5
2.0
Reflection probe
64 px static
128 px baked
256 px live, every 4 frames
512 px live + planar
Particle cap
50
150
400
1000
Target FPS
30
30 (45 option)
60
60 / 90 / 120
14.2 Performance budgets
Metric
Low
Medium
High
Max
Draw calls
under 150
under 250
under 400
under 600
Triangles per frame
150k
300k
600k
1.2M
Memory
under 800 MB
under 1.2 GB
under 1.8 GB
under 2.5 GB
Frame time
33 ms
22–33 ms
16.6 ms
16.6 ms (8.3 ms at 120 FPS)
CPU budget at 60 FPS: physics about 4 ms, gameplay scripts 3 ms, AI and traffic 2 ms, render thread 5 ms. The rest is headroom for spikes.
14.3 Auto-detect and adaptive quality
First launch: read SystemInfo (GPU name, RAM, CPU cores, graphics API), match it against a device table, then run a 10-second benchmark flythrough on the chosen tier.
If average FPS is under 85% of target, drop one tier and test again (at most 2 steps down).
At runtime: if FPS stays 5 below target for 5 seconds, cut render scale in 5% steps (floor 50%). Restore it after 30 seconds of stable frames.
Thermal: on a thermal warning (Android thermal API, iOS thermalState), cap at 30 FPS and drop one tier until the phone cools.
Battery saver mode forces 30 FPS and Low or Medium.
The settings screen shows a live FPS counter and a Test this setting button that runs a 10-second preview.
14.4 Download packs
Base install (Low and Medium assets): about 150–200 MB
HD pack for High: about 300 MB, downloaded on demand
Ultra pack for Max: about 600 MB, downloaded on demand over Wi-Fi
15. Scenario Deep Dive
15.1 Coastal City Highway, element by element
Low
Buildings: 20 box-based models on 512 px atlases, one material per block, windows painted on
Road: one flat mesh, one tiling asphalt texture, painted lane markings, no normal maps
Vegetation: cross-plane and billboard trees, no grass
Lighting: fully baked lightmaps (a separate baked night set), blob shadows under cars
Sky and water: gradient skybox with three time presets blended, flat water plane with a scrolling texture
Props and traffic: lamp posts, simple guardrails, 5 low-poly traffic cars (about 1k triangles each)
Effects: sprite tire smoke only, no weather
Medium
Buildings: 40 models with baked ambient occlusion, modeled balconies and signs, 1K atlases
Road: normal-mapped asphalt, crack decals, reflective lane paint, curb geometry
Vegetation: low-poly 3D trees (about 800 triangles) with vertex-shader wind, palm rows, grass cards near the road
Lighting: baked GI plus one real-time car shadow, light probes, baked reflection probes
Sky and water: dynamic skybox with scrolling clouds, water with a scrolling normal map and fake reflections
Props and traffic: guard rails, signs, billboards, cones, bus stops, 10 traffic cars in 4 types (about 3k triangles)
Effects: dust, smoke, limited tire marks (40 segments), fake headlight cones, bloom
High
Buildings: 60 models with parallax interior windows, rooftop props and ads, 2K atlases
Road: PBR asphalt with a wetness mask, oil and skid decals, 3D expansion joints
Vegetation: LOD trees with sway, three grass densities, bushes, flowers
Lighting: real-time sun with 2 soft cascades, baked GI blended with probes, real headlight spot lights
Sky and water: layered clouds, water with shoreline foam and light refraction
Props and traffic: traffic lights that cycle, readable road signs, 20 traffic cars with brake lights and indicators, a distant cargo ship, seagulls
Effects: rain with splashes and screen droplets, motion blur, a color grading LUT per time of day, sparks on scrapes
Max
Buildings: 80+ models with glass reflections, animated LED billboards, spinning rooftop fans
Road: wet asphalt with puddles that reflect (planar and SSR), long-lasting tire marks (200 segments), heat shimmer
Vegetation: dense grass, swaying leaves, falling leaves, flower fields
Lighting: 4 cascades with contact shadows, SSAO, up to 8 lights per object, volumetric fog, light shafts, lens flares
Sky and water: fully dynamic sky, ocean waves with foam, sun glitter on the water
Props and traffic: 30 traffic cars, pedestrians on sidewalks, waving flags, ambient ships and helicopters
Effects: volumetric tire smoke, glowing brake discs, nitro flames with heat distortion, depth of field in replays and photo mode, water droplets on the camera lens
15.2 Track list
Track
Length
Signature feature
Best car
Time-of-day highlight
Coastal City Highway
6.5 km
Sea views, long straights, a tunnel
Lamborghini
Sunset
Neon Downtown
4 km
Tight streets, neon lights, rain
BMW M4
Night
Mountain Serpentine
7 km
Hairpins and cliff edges
BMW M4
Dawn
Desert Canyon
8 km
Big jumps, sandy drifts, heat haze
Bugatti
Midday
Forest Rally
5 km
Gravel and mud, fog
Supra
Morning mist
Airport Runway Loop
3 km
Top speed runs and drag races
Bugatti
Night
Every track ships with three layouts: forward, reverse and a short sprint.
15.3 Track production pipeline
Blockout the road with ProBuilder or Blender (week 1)
Build the road along a spline with a road tool or a custom script
Gameplay pass: checkpoints, AI racing lines, traffic lanes, boost zones
Art pass using shared modular kits (about 60% of assets are reused across tracks)
Bake lightmaps for three time sets (day, dusk, night) for Low and Medium
Build tier variants: LODs, atlases, prop density, particle caps
Playtest on a Low and a Max device before signing off
16. Car Deep Dive
16.1 Game stats (balanced for gameplay, not real-world)
Car
Top speed
Accel
Handling
Braking
Drift
Nitro
Drivetrain
Lamborghini
9
9
8
7
6
7
AWD
Bugatti
10
10
5
6
3
9
AWD
Supra
7
7
8
7
9
7
RWD
BMW M4
8
8
9
9
7
7
RWD
Approximate real-world reference figures, to guide the feel:
Lamborghini Huracán Evo: 5.2 L V10, about 631 hp, 0–100 km/h in about 2.9 s
Bugatti Chiron: 8.0 L quad-turbo W16, about 1,479 hp, 0–100 km/h in about 2.4 s, limited to 420 km/h
Toyota GR Supra (A90): 3.0 L turbo inline-6, about 382 hp, 0–100 km/h in about 4.1 s
BMW M4 Competition (G82): 3.0 L twin-turbo inline-6, about 503 hp, 0–100 km/h in about 3.5 s
16.2 Modeling pipeline per car
Gather blueprints and about 200 reference photos
Blockout at real-world dimensions
High-poly subdivision modeling (panel gaps, vents, badges)
Retopology into the game mesh
Bake normal, ambient occlusion and curvature maps
Texture in Substance Painter (smart materials, a trim sheet for the interior)
Rig wheels, steering, suspension, and doors or hood if animated
Build LODs, collision mesh and damage zones
Review in showroom lighting and at three times of day
An experienced artist needs roughly 80–150 hours per hero car.
16.3 Triangle budget (Max tier, LOD0)
Part
Triangles
Body
35k
Wheels (4)
24k
Interior
25k
Lights
6k
Undercarriage
5k
Mirrors, exhaust, misc
5k
Total
about 100k
LOD1 is about 50k, LOD2 about 20k and LOD3 about 5k. Lower tiers use their own LOD0 caps: Low 15k, Medium 30k, High 60k, Max 100k.
16.4 Materials and shaders
Car paint: Shader Graph with base color, metallic flakes (noise normal), a clear-coat layer and fresnel. Low tier uses a simple lit shader with a fake matcap reflection.
Glass: tinted and transparent with reflections. Low tier uses opaque dark glass to avoid transparency overdraw.
Headlights: lens mesh, emissive LED strip and a projected light pool on the road. Max adds a visible light shaft.
Tires: tread normal map and sidewall lettering. Max adds subtle shader-based deformation under load.
Brake discs: emissive orange ramp that grows with brake heat (Max only).
Carbon fiber: anisotropic weave normal map.
Dirt and wetness: an overlay mask that grows in rain and after off-road driving.
16.5 Customization and upgrades
Cosmetic: 20+ paint colors in gloss, matte, pearl, chrome and color-shift finishes. 15 rim designs per car, 6 spoilers, body kits, window tint, license plate text, underglow neon, tire smoke color and a sticker or livery editor.
Performance parts (5 levels each): engine, turbo, transmission, tires, suspension, brakes, weight reduction and nitro. Each level adds 3–6% to its stat, and a fully upgraded car caps at about +25% so cars stay distinct.
Tuning sliders: gear ratio, steering sensitivity, brake bias, downforce, ride height and camber.
17. Day/Night Deep Dive
17.1 Architecture
A TimeOfDayManager singleton holds the current hour (0–24), the time scale and the mode (Auto, Fixed Day, Fixed Night).
A TimeOfDayProfile ScriptableObject per track holds gradients and curves for sun color and intensity, ambient sky, equator and ground colors, fog color and density, skybox tint and exposure, bloom, and the color grading LUT blend.
Sun angle = (hour / 24) × 360° − 90°, so 6:00 is sunrise and 18:00 is sunset. A cool blue moon light sits opposite the sun at 10–20% intensity.
Street lamps, windows, car lights, audio and the minimap tint subscribe to an OnTimeChanged event, throttled to every 0.25 s instead of every frame.
17.2 Phases
Phase
Hours
Sun
Sky
Notes
Dawn
5–7
Low, warm orange
Pink and orange gradient, mist
Lamps switch off between 5 and 6, long shadows
Day
7–17
High, white
Blue with clouds
Full contrast and best visibility
Dusk
17–19
Low, deep orange
Orange fading to purple
Headlights on when the sun is under 8° elevation, lamps on between 18 and 19
Night
19–5
None (moon only)
Dark blue with stars
Neon on, windows lit, headlights essential
17.3 Lighting per tier
Low: two or three baked lightmap sets (day, dusk, night) cross-faded in the shader, blended skybox presets, no real-time lights.
Medium: same as Low, plus baked reflection probes blended by time, with fake light cones for lamps and headlights.
High: real-time sun with 2 cascades, baked GI from probes blended between sets, 4 pooled spot lights on the nearest lamps, real headlight spot lights.
Max: fully dynamic sun and moon, reflection probes re-captured around the player every few seconds, volumetric fog and sun shafts at dawn and dusk, and screen-space reflections on wet night roads.
17.4 Lights that react to time
Windows: each window gets a random threshold from its position hash, so lights come on gradually between 18:00 and 21:00 and go off between 04:00 and 06:00, with no pop.
Street lamps: emissive material driven by a MaterialPropertyBlock, plus pooled real lights on High and Max.
Neon and billboards: flicker animation at night. Animated LED screens only at Max.
Car lights: headlights switch on automatically at dusk and in tunnels (trigger volumes). High beams are manual. Brake lights always work. Underglow is most visible at night.
Eye adaptation: exposure eases over about 1.5 s when entering or leaving a tunnel.
17.5 Interaction with weather
Rain or overcast cuts sun intensity by 50–60%, raises fog density and darkens ambient light.
Road wetness rises from 0 to 1 over about 20 seconds.
Night rain at Max gives the strongest reflections in the game.
17.6 Player controls and testing
Modes: Auto (the clock runs), Fixed Day, Fixed Night. Free Roam supports 1×, 4× and 12× time speed. Races lock to 1× for fairness.
Test that nothing pops at phase changes, the HUD and minimap stay readable at night, road markings stay visible, sunrise glare does not blind the player, colors work for colorblind players, and FPS and battery hold across a full 24-hour loop.
18. Driving Physics, Controls and AI Deep Dive
18.1 Vehicle model
Mass (starting values): Bugatti about 2,000 kg, BMW M4 about 1,700 kg, Supra about 1,550 kg, Lamborghini about 1,450 kg. Lower the center of mass 0.3–0.5 m below the geometric center.
Suspension: use WheelColliders for the prototype, then move to custom raycast suspension with a spring and damper per wheel. It is cheaper and more stable on mobile.
Tires: simplified Pacejka curves for lateral and longitudinal grip, slip angle and load sensitivity. Surface multipliers: asphalt 1.0, wet 0.7, gravel 0.55, sand 0.45.
Drivetrain: a torque curve per car, gear ratios, final drive, 150–300 ms shift time, an RWD or AWD torque split and a simple differential.
Aerodynamics: drag and downforce both scale with speed squared. Bugatti has high drag, Lamborghini has high downforce.
Physics tick: fixed timestep of 0.02 s (50 Hz) with rigidbody interpolation. Reduce solver iterations on Low.
18.2 Handling assists
Steering assist, stability control, traction control, ABS, auto-brake, drift angle assist and an automatic gearbox
Every assist is toggleable, with Beginner, Normal and Pro presets
18.3 Controls
Tilt steering with calibration, dead zone and sensitivity sliders
On-screen wheel or left/right buttons, with manual pedals or auto-accelerate
A layout editor to move and resize buttons, plus a left-handed mode
Haptics for collisions and gear shifts
Bluetooth controller mapping
18.4 Camera
Chase camera on a spring arm with speed-based FOV from 60° to 85°
Hood, cockpit, bumper and cinematic replay cameras
Shake from road surface and nitro, plus radial blur on nitro for High and Max
18.5 Nitro and drafting
Nitro lasts about 4 seconds
It recharges from drifting, near-misses and drafting behind traffic or opponents
18.6 Opponent and traffic AI
Racers: spline racing lines with a speed profile per corner. Three personalities (aggressive, balanced, cautious) and five difficulty levels. Rubber-banding is limited to ±10% speed. Mistake chance rises as difficulty drops. Raycasts help avoid collisions.
Traffic: lane splines with rare lane changes at 40–70% of the player's speed. Near-misses give bonus nitro.
18.7 Collision and damage
Simplified convex colliders and four damage zones (front, rear, left, right)
Visual damage depends on the graphics tier (see the Part 1 table)
No race-ending damage by default, and repairs are free
18.8 Replays and ghosts
Record input and transform every 0.1 s
Replay camera modes and a ghost car for time trials
The server validates leaderboard times by replaying the recorded inputs
19. Game Modes, Progression and Economy
19.1 Career structure
6 chapters (one per track) with 12 events each, for 72 events and 216 stars in total
A chapter unlocks after collecting a set number of stars (for example 20)
Event types: Circuit race (3 laps), Sprint (A to B), Time Attack, Drift Challenge, Top Speed Run, Elimination, Checkpoint Rush, Overtake Challenge and Boss Race
19.2 Economy (starting values to tune)
Car
Price
Supra
Free starter car
BMW M4
80,000 cash
Lamborghini
350,000 cash
Bugatti
1,000,000 cash
Premium currency can speed up purchases, but no car or part is locked behind it alone.
Early race payouts: 1st 5,000, 2nd 3,000, 3rd 1,500, scaled by about ×1.3 per chapter.
Upgrade cost for level n = base cost × 1.6^(n − 1).
19.3 Retention features
7-day daily login cycle, daily and weekly missions
About 50 achievements
Seasonal events and weekly leaderboard challenges
A 50-tier battle pass, mostly cosmetic rewards
19.4 Multiplayer roadmap
Phase 1: asynchronous ghost races and leaderboards
Phase 2: real-time lobbies for 2–6 players with Photon Fusion or Unity Netcode
Phase 3: clubs, tournaments and seasonal ranked ladders
20. UI/UX Deep Dive
20.1 Screen flow
Splash → Loading → Main Menu → Mode Select → Track Select (with the Auto / Day / Night picker) → Car Select → Race Setup → Race HUD → Pause → Results → Rewards.
Side screens: Garage, Upgrades, Customization, Shop, Profile, Leaderboards, Missions and Settings (Graphics, Audio, Controls, Gameplay, Account).
20.2 Graphics settings screen
Four preset buttons (Low, Medium, High, Max) plus Auto
An Advanced section to override shadows, reflections, anti-aliasing, FPS cap, traffic density and effects
A live FPS counter and a 10-second Test this setting preview
A warning when the chosen tier may overheat or drain the battery
20.3 Race HUD
Speedometer and tachometer (digital and analog styles), gear, nitro bar
Minimap tinted by time of day, lap counter, position, lap and best times
Everything sits inside thumb-safe zones and respects notches and rounded corners
Players can hide or scale each element
20.4 Accessibility and localization
Colorblind modes, adjustable text size, subtitles, haptic strength slider, left-handed layout and reduced motion
Launch with English and about 6 more languages (for example Spanish, Portuguese, Hindi, German, French, Arabic)
21. Audio Deep Dive
21.1 Engine sound
Multi-layer RPM loops (idle, low, mid and high, each with on-throttle and off-throttle) crossfaded in FMOD, at least 8 loops per car
Lamborghini: high-pitched V10 scream
Bugatti: deep W16 growl with turbo whoosh
Supra: inline-6 turbo tone with blow-off valve
BMW M4: twin-turbo inline-6 with exhaust burble on lift-off
Record or license engine audio, and do not rip copyrighted game or video sounds
21.2 Environment and music
Ambience per track and time of day (seagulls by day and crickets at night on the coast, rain, wind, tunnel reverb)
8–10 licensed or royalty-free tracks with dynamic layers that rise with speed and position
Doppler, distance attenuation and ducking so the engine, music and UI stay balanced
22. Technical Architecture
22.1 Project structure
Folders: Art (Cars, Tracks, Props, UI), Scripts (Core, Vehicle, AI, UI, Services), Data (ScriptableObjects), Audio, Addressables and Tests
22.2 Code architecture
Data-driven design with CarData, TrackData, UpgradeData and EventData ScriptableObjects
A game state machine: Boot → Menu → Loading → Race → Results
An event bus that decouples the HUD, audio and analytics
Services: Save, Audio, Graphics, Ads and IAP
Optional dependency injection with VContainer or Zenject
22.3 Addressables groups
Core (UI and shared assets), one bundle per car, one bundle per track, an HD pack and an Ultra pack
Hosted on a CDN, with a Wi-Fi prompt before large downloads
22.4 Save data and anti-cheat
Encrypted local JSON with cloud sync
Server-side purchase receipt verification
Leaderboard times validated by replaying the recorded inputs
22.5 Platform requirements
Android: 8.0 (API 26) or newer, 64-bit, Vulkan preferred with an OpenGL ES 3.0 fallback
iOS: 14 or newer, Metal
Minimum 2 GB RAM for the Low tier
22.6 Build and CI
Git with Git LFS, and GitHub Actions or Unity Cloud Build
Nightly builds, with automated FPS and memory capture on a device farm such as Firebase Test Lab or AWS Device Farm
22.7 Analytics events
tutorial_step, race_start, race_finish, car_purchase, upgrade, graphics_tier_changed, ad_watch, iap_purchase and crash
23. QA and Success Metrics
23.1 Device matrix
Tier
Android
iOS
Low
Entry phone, 3 GB RAM, Snapdragon 4-series or Helio G-series
iPhone 8 or SE class
Medium
Snapdragon 7-series, 6 GB RAM
iPhone 11 or 12 class
High
Snapdragon 8-series, 8 GB RAM
iPhone 13 or 14 class
Max
Latest flagship, 12 GB RAM
Latest Pro iPhone
23.2 Test types
Functional, a 30-minute performance soak at each tier, thermal and battery drain, memory leaks
Interruptions (calls, notifications), low storage, network loss during downloads and purchases
23.3 Targets
Crash-free sessions of 99.5% or better and initial load under 15 seconds
Frames under target below 5% of play time
Day 1 retention 35–40%, Day 7 12–15%, Day 30 about 5%
Average session 10–15 minutes and tutorial completion of 80% or higher
24. Release Checklist
Store setup: age rating, privacy policy, Google Play Data Safety form, Apple privacy labels, the iOS tracking prompt and a consent flow for GDPR regions
Marketing: screenshots and a trailer that show each graphics tier and a day-to-night transition, plus ASO keywords
Soft launch: a small region such as Canada, Australia or the Philippines to test retention and performance before going global
Licensing: car brand licenses (or renamed look-alike cars), music, fonts and any asset store packs
25. First 4 Weeks Action Plan
Week
Goal
1
Install Unity LTS with the URP template, set up Git LFS, import a placeholder car, drive it on a flat plane, add tilt and touch input
2
Blockout a 1 km spline road, add the chase camera, a speedometer HUD, checkpoints and laps, and run an Android build on a real phone
3
Build the 4 URP assets with a QualityManager, settings screen and FPS counter, then a first TimeOfDayManager with sun rotation and a skybox gradient
4
Replace the placeholder with your first car (Supra or M4) at Low and Max detail, add auto headlights, profile on two devices and review scope
Vertical slice done when: one track plays at all four tiers, day and night switch cleanly, one car is fully detailed and the game holds its FPS target on a Low and a Max device.
Part 3: Section-by-Section Expansion
Part 3 goes one level deeper on every numbered section above. Numbers match Parts 1 and 2, so section 5 here extends section 5 in Part 1.
1. Concept and Scope (expanded)
Design pillars
Looks great on any phone: the same game scales from entry-level to flagship without feeling like a different game.
A living world: time of day changes the mood, visibility and strategy of every race.
Cars with personality: each of the four cars handles, sounds and rewards a different driving style.
Fair progression: skill and time unlock everything, and paying only speeds things up.
Target players and competition
Core audience: casual to mid-core mobile racing fans who play in short sessions, often one-handed.
Benchmark games to study: Asphalt, CSR Racing, Real Racing 3 and Need for Speed No Limits.
Differentiators: truly scalable graphics (4 tiers), automatic day/night that affects gameplay, and four hero cars with unique abilities.
Core loop
Pick an event
Choose a car and time of day
Race for 2–4 minutes
Earn cash, XP and stars
Upgrade or buy a car
Unlock the next event
Session target: 10–15 minutes, or about 3–4 races.
Scope levels
Level
Contents
MVP
1 car, 1 track, Low and Max tiers, no menus
Vertical slice
1 hero car, 1 polished track, all 4 tiers, day/night, basic HUD
Launch
4 cars, 6 tracks, career, garage, shop, settings, leaderboards
Post-launch
Online lobbies, new cars, seasons, live events
Engine decision
Engine
Strengths
Weaknesses
Unity (URP)
Best mobile ecosystem, C#, large asset store, strong profiling tools
Needs care to reach top-end visuals
Unreal
Best out-of-the-box visuals
Heavy builds, higher minimum device, steeper learning curve
Godot
Lightweight and free
Fewer mobile racing assets and tools
Recommendation: Unity with URP.
Art direction
Realistic with slightly stylized, high-contrast lighting.
Palette: warm magenta and orange sunsets, cool cyan and purple neon nights, crisp daylight.
Keep the UI palette consistent, and build a mood board per track before modeling.
Out of scope for launch
Open-world map, interactive pedestrians, real-time PvP (post-launch), full mechanical damage and VR.
2. Graphics Tiers (expanded)
Author high, derive low
Build every asset once at Max quality, then derive the lower tiers by decimation, smaller textures and simpler shaders. Do not hand-build four versions.
Use one shader per material type with keywords (for example TIER_LOW, TIER_MED) instead of four separate shaders, and strip unused variants at build time.
Pre-warm shaders with a ShaderVariantCollection during loading to avoid hitches on the first race.
Texture formats and memory
Use
Format
Size
Memory with mips
Car body, Max
ASTC 4x4
4096²
about 21 MB per map
Car body, High
ASTC 4x4
2048²
about 5.6 MB per map
Car body, Medium
ASTC 5x5
1024²
about 0.9 MB per map
Car body, Low
ASTC 6x6
512²
about 0.2 MB per map
A Max car with many 4K maps can pass 100 MB. Use 4K only for the body and wheels, and share trim sheets for the interior and small parts.
Feature fallbacks
Feature
Needs
Fallback if unsupported
Planar reflections
Max tier and a strong GPU
Live reflection probe
SSAO
Vulkan or Metal, High or Max
Baked ambient occlusion
Live reflection probe
High or Max
Baked probe
MSAA 4x
GPU support
MSAA 2x
HDR
HDR render format
LDR
Volumetric fog
Max
Height fog
Profiling workflow
Unity Profiler and Frame Debugger, Xcode GPU capture and Instruments on iOS, and Snapdragon Profiler, Arm Mobile Studio or RenderDoc on Android.
Capture on a real device every week, never only in the editor. Log average FPS, 1% low FPS, GPU ms, memory and temperature.
Common mobile pitfalls
Overdraw from large transparent particles and glass
Full-screen post-processing passes on tile-based GPUs
MSAA and big render textures eating memory bandwidth
Real-time shadows with too many casters
Garbage collection spikes from per-frame allocations
Tier sign-off rule
A tier passes when it holds its FPS target on its reference device for 95% of a 10-minute lap session, stays inside its memory budget and does not throttle during a 30-minute soak test.
3. Scenarios (expanded)
Level design principles
Readable corners: every braking zone has a visual marker (a sign, a color change or lights)
Sightlines: at speed, the player should see the next two turns
Pace each lap in three acts: warm-up straight, technical middle, big finale
Offer one risky shortcut or jump per track for skilled players
Keep a clear racing line even in dense scenery and at night
Track identity
Track
Mood and palette
Landmarks
Hazards
Night variant
Coastal City Highway
Warm sunsets, teal sea
Harbor start, tunnel at 2 km, long bridge
Traffic, light change in the tunnel
Lit bridge, cruise ships
Neon Downtown
Cyan, magenta, wet black
Tram line, arcades, elevated roads
Tight turns, crossing trams
Default time, neon reflections
Mountain Serpentine
Cool dawn blues, pine green
Switchbacks, stone tunnels, cliffside village
Open edges, fog
Road reflectors, village lights
Desert Canyon
Orange rock, bleached sky
Natural arch, canyon jump, dune section
Sand patches, crosswinds
Bright stars, campfire glow
Forest Rally
Deep green, mist
Log bridge, waterfall, forest hut
Mud, tree roots, fog
Headlights cutting through fog
Airport Runway Loop
Gray and sodium orange
Hangars, control tower, cargo planes
Wind, tight loop at the end
Runway lights, beacon
Weather and time support
Track
Clear
Overcast
Rain
Fog
Auto day/night
Coastal City Highway
Yes
Yes
Yes
Yes
Yes
Neon Downtown
Yes
Yes
Yes
No
Yes
Mountain Serpentine
Yes
Yes
Yes
Yes
Yes
Desert Canyon
Yes
Yes
No
Sandstorm
Yes
Forest Rally
Yes
Yes
Yes
Yes
Yes
Airport Runway Loop
Yes
Yes
Yes
Yes
Yes
Streaming and chunking
Split each track into 200 m chunks loaded additively and unloaded behind the player.
Keep 3 chunks ahead and 1 behind on Max, and 2 ahead and 1 behind on Low.
Store occlusion data and LOD groups per chunk, and use a cheap baked backdrop mesh for the distant skyline.
Shared environment kit (target counts)
80+ building modules, 150 props, 30 vegetation types, 12 traffic vehicles, 40 decals and 20 road materials, all shared across tracks.
4. Cars (expanded)
Signature ability per car
Car
Ability
How it works
Lamborghini
Launch Control
A start-timing mini-game gives a strong off-the-line boost
Bugatti
Top Speed Mode
Above 300 km/h the rear wing lowers for less drag, and steering gets heavier
Supra
Drift Boost
Holding a drift fills nitro faster and raises the drift score multiplier
BMW M4
Track Mode
Better braking stability and a small grip bonus on corner exit
What makes a car look highly detailed
Panel gaps, vents, grilles and aero parts modeled as real geometry, not only textures
Headlight internals (projector lenses, LED strips) and taillights with depth
Brake calipers and discs visible behind the spokes
3D wheel spokes with tire sidewall text
Exhaust tips with inner geometry and heat tint
Interior with stitched seats, dashboard, gauge cluster, steering wheel, paddles and center console
Engine bay or rear engine cover detail at Max
Subtle imperfections: dust in crevices, soft reflections and paint orange-peel in the normal map
Garage and showroom experience
A turntable with a three-light rig that changes with time of day
Idle engine sound, a rev button, and door and hood animations
Orbit camera with pinch zoom, a free photo mode and a wheel close-up shot
Upgrade parts
Part
Levels
Effect
Engine
5
More power
Turbo
5
More mid-range torque and nitro strength
Transmission
5
Faster shifts and better acceleration
Tires
5
More grip
Suspension
5
Better handling and stability
Brakes
5
More braking power
Weight reduction
5
Better acceleration and handling
Nitro
5
Longer duration and stronger boost
Balancing method
Build a spreadsheet that estimates lap time per car per track from power, mass, grip and drag.
Give each car a track type where it wins by about 2–4%: Bugatti on Runway Loop and Desert Canyon, BMW M4 on Mountain Serpentine and Neon Downtown, Supra on Forest Rally, Lamborghini on Coastal City Highway.
Check with AI lap-time tests, then with playtest telemetry after launch.
5. Day/Night (expanded)
Starting values by hour
Hour
Sun elevation
Sun intensity
Color temperature
Fog density
05:00
−15°
0.05
about 8000 K (blue)
High
06:00
0°
0.3
about 2500 K
High
07:00
15°
0.7
about 3500 K
Medium
09:00
45°
1.0
about 5500 K
Low
12:00
90°
1.2
about 6500 K
Lowest
15:00
45°
1.0
about 5500 K
Low
17:00
15°
0.7
about 3500 K
Medium
18:00
0°
0.3
about 2200 K
Medium-high
19:00
−15°
0.05
about 8000 K (blue hour)
Medium
21:00
−45°
0 (moon 0.15)
about 8000 K (moon)
Low
00:00
−90°
0 (moon 0.2)
about 8000 K (moon)
Low
These are starting values. Tune them by eye on each track.
Sky rendering
A procedural gradient skybox with sun disc, moon disc and a star texture that fades in when the sun drops below 0°, plus a scrolling cloud layer.
Cloud color follows the sun color, so clouds glow orange at sunrise and sunset.
One color grading LUT per phase, blended as time moves.
Baking and probes
Bake three lighting scenarios (day, dusk, night) and blend between them. Unity 6 Adaptive Probe Volumes can blend lighting scenarios (check your Unity version).
On Low and Medium, blend lightmaps in the shader. On High and Max, add the real-time sun on top of the baked GI.
Edge cases
Time changes during a race: always interpolate, never jump.
Tunnels: trigger volumes override exposure and turn headlights on.
Replays: store the start hour and replay the same time scale.
Online lobbies: the host picks the hour and the server sends it to all players.
Pause and menus: freeze the clock but keep slow ambient animation.
Gameplay effects of time of day
Night races pay a small cash bonus (about +10%) so players try them.
Oncoming traffic and AI cars use headlights, making them easy to spot.
Reflective signs, road studs and emissive lane lines keep the road readable at night.
HUD brightness dims automatically at night, and the minimap switches to a night palette.
Cost target
The time-of-day system should cost under 0.5 ms of CPU per frame on the lowest supported device. Update gradients every 0.25 s and cache the evaluated colors.
6. Driving Physics and Controls (expanded)
Per-car tuning parameters (stored in a ScriptableObject)
Spring rate: 35,000–55,000 N/m, damper: 3,000–5,000 N·s/m, plus an anti-roll bar value front and rear
Brake torque: 2,000–3,500 N·m per wheel
Tire grip: peak lateral friction about 1.1–1.4 for sport tires, with a peak slip angle of 6–9°
Center of mass height, wheelbase, track width, drag coefficient and downforce coefficient
These are starting ranges. Tune them with the tests below.
Speed-sensitive steering
Speed
Max steering angle
0 km/h
35°
50 km/h
28°
100 km/h
18°
200 km/h
9°
300 km/h
4°
Drift model
A drift starts when slip angle exceeds about 15° above 40 km/h.
Drift score per second = slip angle (degrees) × speed (km/h) × 0.05, multiplied by a combo of up to ×5 while the chain continues. A crash or a straightened car resets the combo.
The handbrake cuts rear grip by about 40% for 0.5 s to initiate a drift.
Physics test scenarios
Test
Method
Pass condition
0–100 km/h
Flat straight road
Within ±5% of the target time
100–0 km/h braking
Flat straight road
Within ±5% of the target distance
Skidpad
50 m radius circle
Holds the target lateral g (tune around 1.0–1.2 g)
Slalom
Cones every 18 m
No snap oversteer on Normal assists
Jump landing
3 m drop
No rollover and no bounce longer than 0.5 s
Wall collision
100 km/h into a wall
No tunneling and no explosive rebound
Surfaces
Asphalt, wet asphalt, gravel, sand, grass and kerbs, each with a grip multiplier, its own tire sound and its own particle effect.
Kerbs add a small vibration and camera shake.
Mobile physics optimizations
Far AI cars (beyond about 80 m) move with a simplified kinematic model instead of full physics.
Traffic out of view goes to sleep.
Use the layer collision matrix so only needed pairs collide, and build road colliders as simple meshes per chunk.
Keep the simulation deterministic: fixed timestep only, no use of frame delta time inside the vehicle code. This makes replays and ghosts reliable.
7. Game Modes and Progression (expanded)
Mode specifications
Mode
Objective
Length
Reward
Circuit Race
Finish first over 3 laps against 5–7 AI cars
3–5 min
Cash, XP, stars
Sprint
Point-to-point race
2–3 min
Cash, XP, stars
Time Trial
Beat bronze, silver and gold times, with a ghost
1–3 min
Stars, bonus cash
Drift Challenge
Reach a score target
2 min
Cash, XP
Top Speed Run
Hit target speeds through speed traps
1 min
Cash, stars
Elimination
The last-place car is eliminated every 20 s
3 min
Cash, XP, stars
Checkpoint Rush
Reach checkpoints before the timer ends
2–3 min
Cash, XP
Overtake Challenge
Pass a set number of traffic cars
2 min
Cash, nitro
Free Roam
Collectibles, jumps, photo spots, speed cameras
Open
Cash, XP
Star rules
1 star: finish the event
2 stars: reach the podium or the silver time
3 stars: win, or beat the gold time, plus an optional side challenge
Player XP
XP needed to go from a level to the next = 100 × level^1.5 (rounded).
Level
XP to next level
5
1,118
10
3,162
20
8,944
30
16,432
50
35,355
First 10 minutes (first-time experience)
Time
What happens
0:00–0:30
Splash, graphics auto-detect, short cinematic of the Supra at sunset
0:30–1:30
Scripted first race with steering guidance, designed so the player wins
1:30–2:30
Braking and drift prompts
2:30–3:30
Nitro tutorial
3:30–5:00
Results, first upgrade, garage tour
5:00–10:00
Second event, first star chase, daily reward introduction
Difficulty and fairness
Every event shows a difficulty rating from 1 to 5.
After three failed attempts the game offers assists or an easier event.
AI skill scales per event, with limited rubber-banding of ±10% speed.
8. UI/UX (expanded)
Design system
An 8 dp spacing grid, with touch targets of at least 48 dp.
Dark base UI with an accent color that shifts with the time of day (warm at sunset, cyan at night).
Two font weights, with tabular numerals for speed and timers.
One consistent icon set, and three button types: primary, secondary, destructive.
Use uGUI with TextMeshPro and sprite atlases.
Navigation rules
Maximum 3 taps from launch to the start of a race.
A bottom bar with Race, Garage, Shop and Events, and the main action always in the bottom third of the screen for thumb reach.
Every purchase shows the clear price and a confirmation step.
Motion
Screen transitions 150–300 ms with ease-out, and button feedback within 100 ms plus a haptic tick.
Cinematics and reward animations are always skippable.
UI performance
Split static and dynamic content into separate canvases.
Avoid layout groups at runtime, turn off raycast on non-interactive graphics and pool scroll-list items.
UX test plan
A 5-second test of the main menu, and first-time-user sessions with at least 5 players.
Track the funnel: launch → first race start → first race finish → first upgrade → first purchase.
Monetization UI ethics
Show real prices, avoid fake countdown pressure and hidden costs, and add a parental gate if the game may attract children.
9. Audio (expanded)
Asset list
Category
Count
Notes
Engine loops
32
8 per car (4 RPM bands, on and off throttle)
Tire and surface sounds
24
Squeal, skid and roll for each surface
Collisions
12
Light, medium, heavy and scrape
Nitro, turbo and backfire
8
Ambience
24
6 tracks × day and night × 2 weather states
Music
10
3–4 minute loops with stems
UI
30
Announcer lines (optional)
about 60
Budget: 40–60 MB compressed. Use Vorbis for music and ambience, ADPCM for short effects, and stream the music.
Engine audio implementation
Crossfade 4 RPM bands with overlapping curves, with separate on-throttle and off-throttle sets blended by throttle input.
Allow about ±20% pitch shift within each band.
Add a rev limiter cut at redline, pops on lift-off at high RPM, turbo spool and blow-off tied to boost, and a shift transient on each gear change.
The camera view changes the mix: cockpit is muffled with a low-pass filter, exterior is open. Tunnels add reverb zones.
Apply Doppler to traffic and rivals.
Mixing
Bus tree: Master → Music, SFX (Engine, Tires, Collisions, Ambience), UI, Voice.
Aim for about −16 LUFS overall for mobile, and duck music by about 6 dB under the announcer and heavy collisions.
Check the mix on a phone speaker and on headphones.
Audio accessibility
Separate sliders for music, effects and engine, a mono audio option and optional visual cues for key sounds.
10. Optimization (expanded)
Area
Techniques
Target
CPU
Object pooling, no per-frame allocations, Jobs and Burst for traffic AI, throttled updates
Main thread 10 ms or less at 60 FPS
GPU
SRP Batcher, GPU instancing, static batching for the environment, LODs, low overdraw, simple shaders
14 ms or less at 60 FPS
Memory
ASTC textures, mipmap streaming, Addressables unloading, compressed audio
Inside the tier budget
Loading
Async scene loading, shader pre-warming, loading tips
Cold start under 15 s, track load under 8 s
Battery and thermal
FPS cap, resolution scale, drop a tier on thermal warning
About 15% drain per 30 min on High
Build size
Strip engine code, Android App Bundle with asset packs, remove unused shader variants
Base install under 200 MB
Physics
Layer matrix, chunked road colliders, fewer rigidbodies, sleeping traffic
Physics 4 ms or less
Unity settings to check
SRP Batcher on, dynamic batching off, GPU instancing on for traffic and props.
Mipmap streaming on with a per-tier memory budget.
LOD cross-fade off on mobile, and vSync off with Application.targetFrameRate set per tier.
Incremental garbage collection on, and avoid LINQ and string concatenation in gameplay code.
11. Backend and Monetization (expanded)
Backend services
Need
Options
Login and profiles
Firebase Auth, PlayFab, Nakama
Cloud save
Firestore, PlayFab data, Nakama storage
Leaderboards
PlayFab, Firebase with Cloud Functions, Nakama
Remote config and live events
Firebase Remote Config, PlayFab title data, Nakama
Analytics
Firebase Analytics, Unity Analytics, GameAnalytics
Crash reporting
Firebase Crashlytics, Sentry
Push notifications
Firebase Cloud Messaging, Apple Push Notification service
Player data model
Profile: id, name, level, XP
Garage: owned cars, upgrade levels, paints, wheels, stickers
Inventory: cash, gems, consumables
Progress: stars per event, best times, unlocked tracks
Settings: graphics tier, controls layout, audio levels
Purchases: store receipts, verified server-side
Store catalog (prices set per region through the store price tiers)
Starter pack (one time), three sizes of cash packs, gem packs
No Ads purchase (removes interstitials, keeps optional rewarded ads)
Cosmetic bundles and premium car packs
A seasonal battle pass
Ads rules
Rewarded ads: double race reward, a free upgrade trial, a bonus daily reward.
Interstitial ads: never during a race, none in the first 15 minutes, at most one every 5 minutes, and none for paying players.
Live ops calendar
A weekly event, a monthly featured car, an 8-week season with a pass, and holiday events.
Compliance
Age gate and COPPA rules if children may play, privacy consent for GDPR and CCPA regions, and server-side receipt verification.
Avoid paid random-outcome boxes. If you add any, disclose the odds and check local laws.
Metrics to watch
Payer conversion, ARPDAU, ad impressions per daily user, and Day 1 / 7 / 30 retention.
12. Roadmap (expanded)
Milestones and exit criteria
Milestone
Deliverable
Exit criteria
M0 Pre-production
Design doc, art bible, tech tests, risk list
Scope approved, engine locked
M1 Prototype
Drivable car, test road, touch and tilt input, Android build
Fun for 5 minutes, 30 FPS on a mid-range device
M2 Vertical slice
One track, 4 tiers, day/night, 1 hero car, HUD
Targets met on 2 devices, go/no-go decision
M3 Content production
All cars, tracks, career, UI, audio
Feature complete
M4 Alpha
Full game playable end to end
No blockers, draft economy balance, go/no-go decision
M5 Beta
Polish, optimization, localization, store assets
Crash-free 99%+, healthy soft-launch KPIs
M6 Launch
Global release
Store approval
M7 Live ops
Updates every 4–6 weeks
Retention and revenue goals
Solo timeline by quarter (12–18 months)
Quarter
Focus
Q1
Prototype, physics, input, graphics tier skeleton
Q2
Vertical slice: hero car, track 1, day/night, HUD
Q3
Cars 2 and 3, tracks 2 and 3, career framework, garage
Q4
Car 4, tracks 4–6, audio, shop, backend
Q5
Alpha and beta, optimization, localization, soft launch
Q6
Launch and live ops (if the schedule runs to 18 months)
Team roles
Role
Solo approach
Small team (4–6)
Designer and producer
You
1 person
Gameplay and physics programmer
You
1 person
Technical and graphics artist
You, learning as you go
1 person
Car artist
Buy licensed base models and refine them
1–2 people
Environment artist
Modular kits from asset stores plus your own work
1 person
UI/UX artist
UI kit plus your own polish
Part-time or 1 person
Audio
License or commission
Contractor
QA
Friends plus a device cloud
1 person or contractor
Rough budget
Solo: from a few thousand to about 15,000 USD for assets, licenses, test devices, cloud services and the Apple and Google developer program fees.
Small team: roughly 150,000–400,000 USD over 6–9 months, mostly salaries.
These are rough planning ranges, not quotes.
Go/no-go gates
After M2: is it fun to drive, and does it hit its FPS targets on real devices?
After M4: do soft-launch retention numbers justify more content and marketing?
13. Risks (expanded)
Risk register
Risk
Likelihood
Impact
Mitigation
Car art takes too long
High
High
Buy or commission base meshes, finish one car before starting the next, cap LOD0 at 100k triangles
Poor performance on low-end phones
High
High
Weekly real-device tests, tier budgets, adaptive quality
Scope creep
High
High
Locked scope document, a cut list, the vertical slice gate
Physics feels bad
Medium
High
Prototype first, playtest early, assist presets
Trademark and licensing
Medium
High
Use renamed cars or secure licenses before public release
Thermal throttling and battery complaints
Medium
Medium
FPS caps, thermal API, battery saver mode
Build size too large
Medium
Medium
Addressables, download packs, ASTC compression
Low retention
Medium
High
Polish the first 10 minutes, daily rewards, soft-launch iteration
Solo burnout
Medium
High
Milestone cadence, scheduled breaks, ship small updates
Store rejection or compliance issues
Low
Medium
Follow store policies, test builds early, complete privacy forms
Leaderboard cheating
Medium
Low
Server validation and replay checks
Scope cut order (if time runs short)
Real-time multiplayer
Tracks 5 and 6
Livery and sticker editor
Dents and detachable parts
Max-tier extras (planar reflections, volumetric fog)
Free Roam mode
Keep all four cars and all four graphics tiers, since they are the core promise of the game.
14. Graphics Tier Deep Dive (expanded)
Switching tiers in code
Each tier is a Unity Quality Level that points to its own URP asset (Project Settings, Quality).
public enum GraphicsTier { Low, Medium, High, Max }public static class GraphicsService{    const string TierKey = "gfx_tier";    public static void Apply(GraphicsTier tier)    {        QualitySettings.SetQualityLevel((int)tier);        QualitySettings.vSyncCount = 0;        Application.targetFrameRate = tier <= GraphicsTier.Medium ? 30 : 60;        PlayerPrefs.SetInt(TierKey, (int)tier);    }}
Culling distances (starting values)
Object type
Low
Medium
High
Max
Props
40 m
60 m
90 m
140 m
Vegetation
60 m
100 m
160 m
250 m
Buildings (LOD swap)
80 m
120 m
200 m
300 m
Traffic cars
100 m
150 m
250 m
400 m
Shadow caster rules
Low: blob shadows only
Medium: player and rival cars only
High: cars and large props
Max: cars, large props, buildings and vegetation near the road
Particle budgets per effect (maximum particles)
Effect
Low
Medium
High
Max
Tire smoke (per car)
10
25
50
100
Sparks
0
5
20
60
Dust and dirt
5
20
50
120
Rain
None
None
500
1,500
15. Scenario Deep Dive (expanded): other tracks by tier
Neon Downtown
Tier
What the player sees
Low
Flat-color facades with emissive sign textures and baked glow. No reflections, and the wet look is faked with a darker road texture.
Medium
Modeled arcades and tram line, scrolling neon textures, baked reflection probes on the road, simple bloom.
High
Wet-road look with a live reflection probe, flickering neon, rain with splashes, steam vents, car reflections.
Max
Planar and screen-space reflections of every sign, volumetric fog around lights, holographic billboards, pedestrians with umbrellas, a tram with moving lights, raindrops on the lens.
Mountain Serpentine
Tier
What the player sees
Low
Low-poly terrain with baked shadows, billboard pines, a flat fog gradient, stone walls as textured strips.
Medium
Terrain with detail textures, 3D pines near the road, modeled rocks, animated mist cards.
High
Real-time cliff shadows, grass and wildflowers, waterfalls with particles, morning mist layers, sun rays, wet road after rain.
Max
Volumetric valley fog, god rays through trees, a detailed village with lit windows, moving cloud shadows over the valley, birds, snow patches at altitude.
Desert Canyon
Tier
What the player sees
Low
Layered rock meshes with baked shading, a tiling sand plane, billboard cacti, simple dust sprites.
Medium
Rock walls with normal maps, dune shapes, 3D cacti and dead trees, wind-driven dust cards.
High
Real-time shadows in the canyon, heat haze on the distant road, tire tracks in the sand, tumbleweeds, sandstorm weather.
Max
Heat distortion, volumetric dust shafts, deformable sand tracks, wildlife, and a star-filled night sky.
Forest Rally
Tier
What the player sees
Low
Billboard trees with baked light, a flat mud road texture, simple fog.
Medium
3D trees near the road with LODs, mud normal maps, fog layers, leaf decals.
High
Trees swaying in the wind, puddles that splash, mud spray on the car, light beams through the canopy, a waterfall.
Max
Mud tracks that deform, volumetric fog with light shafts, falling leaves and insects, wet foliage sheen, mud splatter that builds up on the car.
Airport Runway Loop
Tier
What the player sees
Low
Simple hangars, a flat runway with painted markings, static low-poly planes, baked lighting.
Medium
A modeled control tower, ground vehicles, runway light cones, heat shimmer on the tarmac.
High
Taxiing planes, a wind sock, reflective hangar doors, bloom on night runway lights, jet blast particles.
Max
Aircraft taking off and landing with sound and shadows, wet runway reflections, volumetric beacon and searchlights, ground crew, jet blast distortion.
16. Car Deep Dive (expanded)
Car detail by graphics tier
Feature
Low
Medium
High
Max
Interior
Dark silhouette
Simple dashboard and seats
Full interior with textured gauges
Fully modeled cockpit, working gauges, stitching normal maps
Wheels
Simple spokes, painted caliper
Modeled spokes, baked caliper
3D spokes, caliper and disc
Plus brake glow and tire deformation
Headlights
Textured emissive
Emissive plus sprite flare
Projector lens and light cone
Detailed internals, LED animation, volumetric beam
Paint
Fake matcap
Standard PBR
PBR with clear coat
Clear coat, metallic flakes, orange peel
Reflections
Static cubemap
Baked probe
Live probe
Live probe, SSR and planar
Glass
Opaque dark
Tinted transparent
Reflective with visible interior
Plus rain droplets, dirt and defrost lines
Damage
None
Scratch decals
Dents
Dents and detachable parts (bumper, mirror)
Dirt and wetness
None
Static dirt overlay
Dynamic dirt
Dirt, water beads and mud splatter
Exhaust
None
Smoke sprite
Pops and flames at redline
Heat haze, flames and glowing tips
Shadows
Blob
Real-time cast on road
Soft shadows
Contact shadows and AO under the car
Photo mode
Off
Basic filters
Depth of field and filters
Full controls (exposure, depth of field, time of day)
Signature design details to model
Car
Details that make it recognizable
Lamborghini
Y-shaped LED light signature, hexagonal vents and exhaust, angular body creases
Bugatti
Horseshoe grille, C-shaped side line, central spine, deployable rear wing
Supra
Double-bubble roof, long hood and short wheelbase, side vents, wide rear haunches
BMW M4
Large kidney grille, quad exhaust tips, power-dome hood, slim LED taillights
Use real badges and logos only if you hold the licenses. Otherwise use generic emblems.
17. Day/Night Deep Dive (expanded)
Core time-of-day script
A minimal version to start from. In the real project, update only every 0.25 s and cache the evaluated colors.
public class TimeOfDayManager : MonoBehaviour{    [Range(0f, 24f)] public float hour = 17f;    public float minutesPerDay = 24f; // real minutes for a full in-game day    public Light sun;    public Gradient sunColor;    public AnimationCurve sunIntensity;    public Gradient fogColor;    void Update()    {        hour = (hour + Time.deltaTime * 24f / (minutesPerDay * 60f)) % 24f;        float t = hour / 24f;        sun.transform.rotation = Quaternion.Euler(t * 360f - 90f, 170f, 0f);        sun.color = sunColor.Evaluate(t);        sun.intensity = sunIntensity.Evaluate(t);        RenderSettings.fogColor = fogColor.Evaluate(t);    }}
One global night value
Compute a single NightFactor from 0 (day) to 1 (night): smoothstep from 17:30 to 19:30 going up, and from 04:30 to 06:30 going down.
Push it to every shader with Shader.SetGlobalFloat, so windows, neon, lamps, car lights, the minimap tint and audio ambience all read the same value.
Debug tools
A time slider and a freeze-time toggle in the debug menu
An automatic screenshot at every full hour on each track, so you can review all 24 looks side by side
An overlay that shows hour, sun elevation, NightFactor and current lighting scenario
18. Driving Physics, Controls and AI (expanded)
Per-car data sheet (approximate real figures, scaled for gameplay)
Car
Mass
Power
Torque
Gears
Drivetrain
Game top speed
Lamborghini
about 1,450 kg
about 631 hp
about 600 N·m
7
AWD
about 325 km/h
Bugatti
about 2,000 kg
about 1,479 hp
about 1,600 N·m
7
AWD
about 420 km/h
Supra
about 1,550 kg
about 382 hp
about 500 N·m
8
RWD
about 250 km/h
BMW M4
about 1,700 kg
about 503 hp
about 650 N·m
8
RWD
about 290 km/h
Nitro tuning (starting values)
Nitro adds about +30% engine power for about 4 seconds.
Recharge: 1 s of drifting adds 0.4 s of nitro, a near-miss adds 0.2 s, and each second of drafting adds 0.2 s.
AI racing line math
Corner speed limit: v = √(a × r), where a is the car's maximum lateral acceleration scaled by AI skill (0.8–1.0) and r is the corner radius.
Look-ahead distance = 0.8 s × current speed, with a minimum of 15 m.
Brake early enough to reach the corner speed limit, using the car's braking deceleration.
Rubber-banding changes target speed by at most ±10%.
Traffic behavior
Traffic drives at 40–70% of the player's top speed on lane splines.
Lane changes are rare and always signaled with indicators for 1 second.
Traffic never stops on the racing line, and its density follows the graphics tier.
19. Progression and Economy (expanded)
Chapter outline
Chapter
Track
Recommended car
Boss race
Stars to unlock
1
Coastal City Highway
Supra (starter)
Harbor sprint
0
2
Neon Downtown
BMW M4
Night elimination
20
3
Mountain Serpentine
BMW M4
Downhill time attack
45
4
Forest Rally
Supra
Mud time trial
75
5
Desert Canyon
Bugatti
Canyon jump challenge
110
6
Airport Runway Loop
Bugatti or Lamborghini
Top speed duel
150
Each chapter has 12 events, a rival crew with a named leader, and one boss race at the end.
Car purchase pacing
Target timing with normal replays: BMW M4 around the end of Chapter 2, Lamborghini during Chapter 5, Bugatti in Chapter 6.
Adjust payouts or prices until each purchase takes about 2–4 hours of play. Use replays, daily rewards and bonus events as extra income.
Premium currency can shorten the wait, but every car and part stays reachable through play.
Rewards to plan
Star milestone rewards at 10, 25, 50, 100 and 200 stars (cash, paint, wheels or a part)
First-win bonuses per event and per car
Weekly challenge rewards, and seasonal cosmetic rewards
20. UI/UX Screens (expanded)
Screen
Layout
Key components
States
Main menu
3D car in the center, top bar with currency and profile, bottom navigation
Large Play button, daily reward icon, event banner
First launch, returning player, offline
Track select
Horizontal carousel of tracks, time and weather chips at the bottom, leaderboard preview on the right
Track card with best time and stars
Locked, unlocked, new
Garage
3D car in the center, stat bars on the left, upgrade and customize tabs on the right
Stat bars, upgrade buttons with cost, paint swatches
Owned, not owned (price), maxed out
Race HUD
Position and lap top-left, minimap top-right, steering bottom-left, gas and nitro bottom-right, speed in the center
Speedometer, nitro bar, countdown, wrong-way warning
Countdown, racing, nitro active, finished
Results
Podium or leaderboard in the center, Continue, Retry and Rewards at the bottom
Counting reward animation, star rating, ghost save, share button
Win, loss, new best
Graphics settings
Preset cards on the left, advanced toggles on the right, FPS counter and Test button at the bottom
Tier cards with a device-fit label, toggles
Auto-detected, custom, warning
21. Audio Cue List (expanded)
Event
Sound
Trigger
Notes
Race countdown
Three beeps and a go tone
Each second
Ducks music
Gear shift
Clunk or whine
On shift
Volume follows throttle
Nitro on
Whoosh and flame
Activation
Slightly ducks the engine
Collision
Scaled by impact speed
Collision callback
Three intensity levels
Tire squeal
Looped by slip
Slip above threshold
Pitch follows slip
Surface change
Roll loop swap
Surface raycast
100 ms crossfade
Near miss
Whoosh and chime
Within 1 m of traffic
Gives nitro
Checkpoint
Short chime
Trigger volume
Wrong way
Warning beep
Direction check
Repeats every 2 s
Time-of-day change
Ambience crossfade
Dusk and dawn
About 10 s fade
Rain
Rain loop and splashes
Weather on
Volume follows intensity
Win or lose
Music stinger
Race end
Music resolves
Drive FMOD with these parameters: RPM, Load, Speed, Slip, Surface, TimeOfDay and Weather.
22. Technical Architecture (expanded)
Folder layout
Assets/  Art/ (Cars, Tracks, Props, UI, VFX)  Scripts/ (Core, Vehicle, AI, Race, UI, Services)  Data/ (Cars, Tracks, Events, Upgrades)  Audio/ (FMOD banks)  AddressableAssetsData/  Tests/ (EditMode, PlayMode)
Use assembly definitions (Core, Vehicle, AI, Race, UI, Services, Tools) to keep compile times low.
Car data asset
[CreateAssetMenu(menuName = "Game/Car Data")]public class CarData : ScriptableObject{    public string carId;    public float massKg;    public float maxPowerHp;    public float maxTorqueNm;    public float topSpeedKmh;    public AnimationCurve torqueCurve;    public float[] gearRatios;    public float finalDrive = 3.4f;    public AssetReferenceGameObject prefabLow, prefabMedium, prefabHigh, prefabMax;}
Addressables strategy
Labels: core, car_supra, car_m4, track_coastal, tier_high, tier_max, and so on.
Load the car prefab for the current tier in the garage, load the track for the current tier at race setup, and unload both when leaving.
Preload the next track while the results screen is shown.
If a High or Max pack is not downloaded, fall back to the best installed tier. Retry downloads with exponential backoff.
Automated tests
EditMode: economy formulas, XP curve, drift score, upgrade costs.
PlayMode: the vehicle test scenarios from section 6.
Replay determinism: the same recorded input must produce the same result every time.
23. QA (expanded)
Smoke test checklist (run on every build)
App launches and graphics auto-detect picks a tier
Tutorial completes
A race starts, runs and finishes
Day and night visibly change
Each car drives and its sound plays
Pause and resume work
Store purchase works in the sandbox
Ads load and reward correctly
Settings persist after a restart
Cloud save restores after a reinstall
Offline play works with installed content
A phone call or notification during a race recovers cleanly
Low storage shows a clear warning
Bug severity
Level
Meaning
S1
Crash, data loss or a blocker
S2
A major feature is broken
S3
Minor issue with a workaround
S4
Cosmetic
Release criteria: no open S1 or S2 bugs and fewer than 20 open S3 bugs.
30-minute soak test
Loop races at each tier on its reference device while logging FPS, temperature, memory and battery.
Pass when FPS stays within target, memory grows by less than 5%, and the device does not throttle hard.
24. Release Timeline (expanded)
When
Tasks
12 weeks before launch
Soft-launch preparation, store listing draft, privacy policy
8 weeks before
Soft launch in test regions, fix top issues, produce the trailer
6 weeks before
App store keywords, screenshots showing tiers and day/night, finalize localization
4 weeks before
Pre-registration, press kit, creator outreach
2 weeks before
Release candidate, final QA, submit for store review early because review times vary
Launch day
Monitor crash rate and KPIs hourly, keep a hotfix plan ready
1–4 weeks after
Patch 1.0.1, first live event, community Q&A
Marketing ideas
Short vertical videos (TikTok, YouTube Shorts, Instagram Reels) comparing Low and Max, and showing the day-to-night transition
A Discord server and a subreddit, a public devlog, and outreach to car-enthusiast creators
Store listing assets
Icon, feature graphic, screenshots in each required size, a trailer, and short and long descriptions
25. First 12 Weeks (expanded)
Week 1, day by day
Day
Task
1
Install Unity LTS, create a URP project, set up Git with LFS and the folder layout
2
Block out or import a placeholder car, add a Rigidbody and 4 WheelColliders
3
Add an engine torque curve, gears, and throttle and brake touch buttons
4
Add tilt steering and speed-sensitive steering
5
Add a chase camera with FOV change and a flat test track with cones
6
Build to a real Android phone and log FPS
7
Review: is it fun? List the top 5 handling problems
Weeks 5–12
Week
Goal
5
Raycast suspension and tire model v1, surfaces
6
Race manager with laps and checkpoints, AI racing line v1
7
Track 1 from blockout to a first art pass, chunk streaming
8
Hero car at Max detail with interior, and a showroom scene
9
Time of day: lighting scenarios, windows, lamps and auto headlights
10
Low and Medium tier versions, auto-detect and adaptive quality
11
HUD polish and audio: engine loops, surface and ambient sounds
12
Vertical slice review on at least 3 real devices, go/no-go decision
Learning resources
Unity Learn and the Unity URP documentation, Catlike Coding tutorials for rendering and shaders, FMOD documentation, and GDC talks on mobile racing optimization.