---
name: Apex Velocity
colors:
  surface: '#10131a'
  surface-dim: '#10131a'
  surface-bright: '#363940'
  surface-container-lowest: '#0b0e14'
  surface-container-low: '#191c22'
  surface-container: '#1d2026'
  surface-container-high: '#272a31'
  surface-container-highest: '#32353c'
  on-surface: '#e1e2eb'
  on-surface-variant: '#bfc7d4'
  inverse-surface: '#e1e2eb'
  inverse-on-surface: '#2e3037'
  outline: '#89919d'
  outline-variant: '#404752'
  surface-tint: '#9dcaff'
  primary: '#9dcaff'
  on-primary: '#003257'
  primary-container: '#3da5ff'
  on-primary-container: '#003962'
  inverse-primary: '#0062a2'
  secondary: '#c0c6da'
  on-secondary: '#293040'
  secondary-container: '#42495a'
  on-secondary-container: '#b1b8cc'
  tertiary: '#bbc6e2'
  on-tertiary: '#253046'
  tertiary-container: '#95a0ba'
  on-tertiary-container: '#2c374d'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d1e4ff'
  primary-fixed-dim: '#9dcaff'
  on-primary-fixed: '#001d35'
  on-primary-fixed-variant: '#00497b'
  secondary-fixed: '#dce2f7'
  secondary-fixed-dim: '#c0c6da'
  on-secondary-fixed: '#141b2a'
  on-secondary-fixed-variant: '#404757'
  tertiary-fixed: '#d7e2ff'
  tertiary-fixed-dim: '#bbc6e2'
  on-tertiary-fixed: '#101b30'
  on-tertiary-fixed-variant: '#3c475d'
  background: '#10131a'
  on-background: '#e1e2eb'
  surface-variant: '#32353c'
  surface-1: '#121722'
  surface-2: '#1a2130'
  surface-3: '#232c3f'
  border: '#2e394f'
  text-primary: '#f2f5fa'
  text-secondary: '#a8b3c7'
  text-disabled: '#5c677d'
  accent-day: '#3da5ff'
  accent-dusk: '#ff8a3d'
  accent-night: '#00e5ff'
  success: '#3ddc84'
  warning: '#ffc933'
  danger: '#ff4d5e'
  gems: '#c084ff'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
  display-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Barlow Condensed
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Barlow Condensed
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
  label-sm:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  telemetry-num:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

UI architecture

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
