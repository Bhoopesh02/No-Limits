import './styleguide.css';
import { GameInfo } from '../../data/GameInfo';
import { UiTheme } from '../../data/UiTheme';
import { Button, ButtonVariant, ButtonVisualState } from '../components/Button';
import { CarCard } from '../components/CarCard';
import { Dropdown, DropdownItem } from '../components/Dropdown';
import { LapBadge, LapBadgeWidget } from '../components/LapBadge';
import { Minimap, MinimapWidget } from '../components/Minimap';
import { Modal } from '../components/Modal';
import { NitroGauge, NitroGaugeWidget } from '../components/NitroGauge';
import { PositionBadge, PositionBadgeWidget } from '../components/PositionBadge';
import { ProgressBar } from '../components/ProgressBar';
import { Slider } from '../components/Slider';
import { Speedometer, SpeedometerWidget } from '../components/Speedometer';
import { StatBar } from '../components/StatBar';
import { Tabs, TabItem } from '../components/Tabs';
import { createToast, showToast } from '../components/Toast';
import { Toggle } from '../components/Toggle';
import { TrackCard } from '../components/TrackCard';
import { SpeedUnit } from '../../core/convertSpeed';

export function initStyleguide(): void {
  document.documentElement.classList.add('is-styleguide');
  const root = document.getElementById('ui-root');
  if (!root) return;

  root.innerHTML = '';

  const page = document.createElement('div');
  page.className = 'sg-page';

  // 1. Header & Controls
  const header = document.createElement('header');
  header.className = 'sg-header';

  const info = document.createElement('div');
  info.className = 'sg-header__info';
  info.innerHTML = `
    <span class="sg-header__badge">${GameInfo.displayName} v${GameInfo.version}</span>
    <h1 class="sg-header__title">Design System & Styleguide</h1>
    <p class="sg-header__desc">Live showcase for design tokens, typography, motion, and core UI components.</p>
  `;
  header.appendChild(info);

  const controls = document.createElement('div');
  controls.className = 'sg-header__controls';

  // Theme switcher
  const themeGroup = document.createElement('div');
  themeGroup.className = 'sg-control-group';
  themeGroup.innerHTML = '<span class="sg-control-group__label">Theme Accent:</span>';

  const themes: Array<'day' | 'dusk' | 'night'> = ['day', 'dusk', 'night'];
  const themeBtns: HTMLButtonElement[] = [];

  const currentTheme = document.documentElement.getAttribute('data-time') || 'day';

  themes.forEach((t) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `sg-theme-btn${t === currentTheme ? ' is-active' : ''}`;
    btn.textContent = t.toUpperCase();
    btn.addEventListener('click', () => {
      document.documentElement.setAttribute('data-time', t);
      themeBtns.forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
    });
    themeBtns.push(btn);
    themeGroup.appendChild(btn);
  });
  controls.appendChild(themeGroup);

  // Reduce motion toggle
  const motionToggle = Toggle({
    label: 'Reduce Motion',
    checked: document.documentElement.getAttribute('data-reduced-motion') === 'true',
    onChange: (checked) => {
      document.documentElement.setAttribute('data-reduced-motion', checked ? 'true' : 'false');
    },
  });
  controls.appendChild(motionToggle);

  header.appendChild(controls);
  page.appendChild(header);

  // 2. Section: Color Tokens
  const colorsSection = createSection(
    '01. Design Tokens — Colors',
    'Curated dark theme palette designed for high contrast and dynamic time-of-day accents.',
  );
  const colorGrid = document.createElement('div');
  colorGrid.className = 'sg-grid';

  const colorItems: Array<{ name: string; hex: string; role: string }> = [
    { name: '--bg-base', hex: UiTheme.colors.bgBase, role: 'Base Background' },
    { name: '--surface-1', hex: UiTheme.colors.surface1, role: 'Surface Level 1' },
    { name: '--surface-2', hex: UiTheme.colors.surface2, role: 'Surface Level 2' },
    { name: '--surface-3', hex: UiTheme.colors.surface3, role: 'Surface Level 3' },
    { name: '--border', hex: UiTheme.colors.border, role: 'Card & Component Border' },
    { name: '--text-primary', hex: UiTheme.colors.textPrimary, role: 'Primary Text (WCAG AA)' },
    { name: '--text-secondary', hex: UiTheme.colors.textSecondary, role: 'Secondary Text' },
    { name: '--text-disabled', hex: UiTheme.colors.textDisabled, role: 'Disabled / Inactive Text' },
    { name: '--accent (Day)', hex: UiTheme.accents.day, role: 'Day Sky Blue Accent' },
    { name: '--accent (Dusk)', hex: UiTheme.accents.dusk, role: 'Dusk Sunset Orange Accent' },
    { name: '--accent (Night)', hex: UiTheme.accents.night, role: 'Night Cyber Cyan Accent' },
    { name: '--success', hex: UiTheme.colors.success, role: 'Success / Upgrades' },
    { name: '--warning', hex: UiTheme.colors.warning, role: 'Warning / Stars' },
    { name: '--danger', hex: UiTheme.colors.danger, role: 'Danger / Lap Limit' },
    { name: '--gems', hex: UiTheme.colors.gems, role: 'Gems / Premium' },
  ];

  colorItems.forEach((c) => {
    const card = document.createElement('div');
    card.className = 'sg-swatch-card';
    card.innerHTML = `
      <div class="sg-swatch-box" style="background-color: ${c.hex};"></div>
      <div class="sg-swatch-info">
        <span class="sg-swatch-name">${c.name}</span>
        <span class="sg-swatch-hex">${c.hex} • ${c.role}</span>
      </div>
    `;
    colorGrid.appendChild(card);
  });
  colorsSection.appendChild(colorGrid);
  page.appendChild(colorsSection);

  // 3. Section: Typography & Numeric
  const typeSection = createSection(
    '02. Typography & Tabular Numerics',
    'Chakra Petch for display and numbers, Barlow for body and UI. Tabular numerals prevent jitter during races.',
  );
  const typeContainer = document.createElement('div');

  const typeScales: Array<{ token: string; size: string; sample: string; isDisplay?: boolean }> = [
    { token: '--fs-48', size: '48px', sample: 'NO LIMITS RACING', isDisplay: true },
    { token: '--fs-32', size: '32px', sample: 'COASTAL CITY HIGHWAY', isDisplay: true },
    { token: '--fs-24', size: '24px', sample: 'KAZE GT - STREET SPEC', isDisplay: true },
    { token: '--fs-20', size: '20px', sample: 'SPEED: 284 KM/H • LAP 2/3', isDisplay: true },
    {
      token: '--fs-16',
      size: '16px',
      sample: 'Standard body text and secondary labels in Barlow.',
    },
    {
      token: '--fs-14',
      size: '14px',
      sample: 'HUD details and button labels with tabular metrics.',
    },
    { token: '--fs-12', size: '12px', sample: 'Micro captions, metadata, and timestamps.' },
  ];

  typeScales.forEach((t) => {
    const row = document.createElement('div');
    row.className = 'sg-type-row';
    row.innerHTML = `
      <div class="sg-type-meta">${t.token} (${t.size})</div>
      <div class="sg-type-sample ${t.isDisplay ? 'tabular-nums' : ''}" style="font-size: ${t.size}; font-family: ${t.isDisplay ? 'var(--font-display)' : 'var(--font-body)'}; font-weight: ${t.isDisplay ? '700' : '400'};">
        ${t.sample}
      </div>
    `;
    typeContainer.appendChild(row);
  });

  const numericDemo = document.createElement('div');
  numericDemo.style.marginTop = 'var(--space-4)';
  numericDemo.style.padding = 'var(--space-3) var(--space-4)';
  numericDemo.style.background = 'var(--surface-2)';
  numericDemo.style.borderRadius = 'var(--radius-s)';
  numericDemo.style.border = '1px solid var(--border)';
  numericDemo.innerHTML = `
    <div style="font-size: var(--fs-12); color: var(--text-secondary); margin-bottom: var(--space-1); text-transform: uppercase;">Tabular Numerics Demonstration</div>
    <div class="tabular-nums" style="font-family: var(--font-display); font-size: var(--fs-24); font-weight: 700; color: var(--accent);">
      SPEED: 298.4 KM/H &nbsp;|&nbsp; LAP: 01:23.456 &nbsp;|&nbsp; CREDITS: $1,450,200
    </div>
  `;
  typeContainer.appendChild(numericDemo);
  typeSection.appendChild(typeContainer);
  page.appendChild(typeSection);

  // 4. Section: Spacing & Elevation
  const spacingSection = createSection(
    '03. Spacing Scale, Radius & Elevation',
    'Strict 4px/8px-based spacing scale, rounded surface tokens, and depth shadow levels.',
  );

  const spacingGrid = document.createElement('div');
  spacingGrid.className = 'sg-grid';

  const spacingContainer = document.createElement('div');
  spacingContainer.innerHTML =
    '<h3 style="font-size: var(--fs-16); margin-bottom: var(--space-3);">Spacing Tokens</h3>';
  const spaces = [
    { token: '--space-1', val: '4px' },
    { token: '--space-2', val: '8px' },
    { token: '--space-3', val: '12px' },
    { token: '--space-4', val: '16px' },
    { token: '--space-5', val: '24px' },
    { token: '--space-6', val: '32px' },
    { token: '--space-7', val: '48px' },
  ];
  spaces.forEach((s) => {
    const row = document.createElement('div');
    row.className = 'sg-spacing-row';
    row.innerHTML = `
      <span class="sg-spacing-label">${s.token} (${s.val})</span>
      <div class="sg-spacing-bar" style="width: ${s.val};"></div>
    `;
    spacingContainer.appendChild(row);
  });
  spacingGrid.appendChild(spacingContainer);

  const radiusElevContainer = document.createElement('div');
  radiusElevContainer.innerHTML =
    '<h3 style="font-size: var(--fs-16); margin-bottom: var(--space-3);">Radius & Elevation</h3>';
  radiusElevContainer.innerHTML += `
    <div style="display: flex; flex-direction: column; gap: var(--space-3);">
      <div style="padding: var(--space-3); background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius-s); box-shadow: var(--elev-1);">
        <strong>--radius-s (6px)</strong> with <strong>--elev-1</strong> (Subtle Card Depth)
      </div>
      <div style="padding: var(--space-4); background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius-m); box-shadow: var(--elev-2);">
        <strong>--radius-m (12px)</strong> with <strong>--elev-2</strong> (Modal & Elevated Panel)
      </div>
      <div style="padding: var(--space-4); background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius-l);">
        <strong>--radius-l (20px)</strong> (Large Hero Container)
      </div>
    </div>
  `;
  spacingGrid.appendChild(radiusElevContainer);

  spacingSection.appendChild(spacingGrid);
  page.appendChild(spacingSection);

  // 5. Section: Buttons
  const buttonSection = createSection(
    '04. Buttons',
    'Primary (min 56px), Secondary, Ghost, and Icon buttons shown across all 5 states: Default, Hover, Focus, Pressed, Disabled.',
  );

  const variants: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'icon'];
  const states: ButtonVisualState[] = ['default', 'hover', 'focus', 'pressed', 'disabled'];

  const playIconSvg =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';

  variants.forEach((v) => {
    const variantRow = document.createElement('div');
    variantRow.style.marginBottom = 'var(--space-4)';
    variantRow.innerHTML = `<h4 style="font-size: var(--fs-14); text-transform: uppercase; color: var(--text-secondary); margin-bottom: var(--space-2);">${v} Button (${v === 'primary' ? '56px min-height' : '48px min-height'})</h4>`;

    const stateRow = document.createElement('div');
    stateRow.className = 'sg-states-row';

    states.forEach((s) => {
      const item = document.createElement('div');
      item.className = 'sg-state-item';

      const label = document.createElement('span');
      label.className = 'sg-state-label';
      label.textContent = s;
      item.appendChild(label);

      const btn = Button({
        variant: v,
        label: v === 'icon' ? undefined : `${v.toUpperCase()}`,
        iconSvg: v === 'icon' ? playIconSvg : undefined,
        ariaLabel: v === 'icon' ? 'Play Action' : undefined,
        visualState: s,
        disabled: s === 'disabled',
      });
      item.appendChild(btn);
      stateRow.appendChild(item);
    });

    variantRow.appendChild(stateRow);
    buttonSection.appendChild(variantRow);
  });
  page.appendChild(buttonSection);

  // 6. Section: Cards (Car & Track)
  const cardSection = createSection(
    '05. Cards (Car & Track)',
    'Interactive cards displaying vehicle specs and track records in Default, Selected, and Locked states.',
  );

  const cardGrid = document.createElement('div');
  cardGrid.className = 'sg-grid';

  // Car Cards
  const carCol = document.createElement('div');
  carCol.innerHTML =
    '<h4 style="font-size: var(--fs-14); text-transform: uppercase; color: var(--text-secondary); margin-bottom: var(--space-3);">Car Cards</h4>';
  const carCardsContainer = document.createElement('div');
  carCardsContainer.style.display = 'flex';
  carCardsContainer.style.flexDirection = 'column';
  carCardsContainer.style.gap = 'var(--space-3)';

  carCardsContainer.appendChild(
    CarCard({
      name: 'KAZE',
      tier: 'Tier 1 • Tuner',
      topSpeed: '240 km/h',
      acceleration: '3.6s',
      handling: '8.4',
      nitro: '320 hp',
      state: 'default',
    }),
  );

  carCardsContainer.appendChild(
    CarCard({
      name: 'CHRONO GT',
      tier: 'Tier 2 • Muscle',
      topSpeed: '265 km/h',
      acceleration: '3.2s',
      handling: '7.9',
      nitro: '380 hp',
      state: 'selected',
    }),
  );

  carCardsContainer.appendChild(
    CarCard({
      name: 'APEX HYPER',
      tier: 'Tier 4 • Exotic',
      topSpeed: '320 km/h',
      acceleration: '2.4s',
      handling: '9.5',
      nitro: '500 hp',
      state: 'locked',
      lockLabel: 'Locked • Reach Level 15',
    }),
  );

  carCol.appendChild(carCardsContainer);
  cardGrid.appendChild(carCol);

  // Track Cards
  const trackCol = document.createElement('div');
  trackCol.innerHTML =
    '<h4 style="font-size: var(--fs-14); text-transform: uppercase; color: var(--text-secondary); margin-bottom: var(--space-3);">Track Cards</h4>';
  const trackCardsContainer = document.createElement('div');
  trackCardsContainer.style.display = 'flex';
  trackCardsContainer.style.flexDirection = 'column';
  trackCardsContainer.style.gap = 'var(--space-3)';

  trackCardsContainer.appendChild(
    TrackCard({
      title: 'Coastal City Highway',
      length: '3.2 km',
      turns: '12 Turns',
      difficulty: 'Easy',
      bestTime: '01:24.50',
      stars: 3,
      state: 'default',
    }),
  );

  trackCardsContainer.appendChild(
    TrackCard({
      title: 'Neon Downtown Loop',
      length: '4.1 km',
      turns: '16 Turns',
      difficulty: 'Medium',
      bestTime: '01:42.15',
      stars: 2,
      state: 'selected',
    }),
  );

  trackCardsContainer.appendChild(
    TrackCard({
      title: 'Midnight Mountain Pass',
      length: '5.8 km',
      turns: '24 Turns',
      difficulty: 'Hard',
      bestTime: '--:--.--',
      stars: 0,
      state: 'locked',
      lockLabel: 'Locked • 10 Stars Required',
    }),
  );

  trackCol.appendChild(trackCardsContainer);
  cardGrid.appendChild(trackCol);

  cardSection.appendChild(cardGrid);
  page.appendChild(cardSection);

  // 7. Section: Stat Bar
  const statSection = createSection(
    '06. Stat Bar',
    'Performance telemetry bars displaying normal baseline values and comparative upgrade deltas.',
  );
  const statGrid = document.createElement('div');
  statGrid.className = 'sg-grid';

  const normalStatBox = document.createElement('div');
  normalStatBox.innerHTML =
    '<h4 style="font-size: var(--fs-14); text-transform: uppercase; color: var(--text-secondary); margin-bottom: var(--space-3);">Normal State</h4>';
  normalStatBox.appendChild(
    StatBar({ label: 'Top Speed', current: 240, max: 350, unit: 'km/h', state: 'normal' }),
  );
  normalStatBox.appendChild(
    StatBar({ label: 'Acceleration', current: 75, max: 100, unit: 'pts', state: 'normal' }),
  );
  statGrid.appendChild(normalStatBox);

  const upgradedStatBox = document.createElement('div');
  upgradedStatBox.innerHTML =
    '<h4 style="font-size: var(--fs-14); text-transform: uppercase; color: var(--text-secondary); margin-bottom: var(--space-3);">Upgraded State</h4>';
  upgradedStatBox.appendChild(
    StatBar({
      label: 'Top Speed',
      current: 240,
      max: 350,
      unit: 'km/h',
      upgrade: 45,
      state: 'upgraded',
    }),
  );
  upgradedStatBox.appendChild(
    StatBar({
      label: 'Acceleration',
      current: 75,
      max: 100,
      unit: 'pts',
      upgrade: 15,
      state: 'upgraded',
    }),
  );
  statGrid.appendChild(upgradedStatBox);

  statSection.appendChild(statGrid);
  page.appendChild(statSection);

  // 8. Section: Form Controls (Toggle & Slider)
  const formSection = createSection(
    '07. Form Controls (Toggle & Slider)',
    'Fully accessible interactive controls shown in Default, Focus, and Disabled states.',
  );
  const formGrid = document.createElement('div');
  formGrid.className = 'sg-grid';

  // Toggle states
  const toggleBox = document.createElement('div');
  toggleBox.innerHTML =
    '<h4 style="font-size: var(--fs-14); text-transform: uppercase; color: var(--text-secondary); margin-bottom: var(--space-3);">Toggle Switch States</h4>';
  const toggleList = document.createElement('div');
  toggleList.style.display = 'flex';
  toggleList.style.flexDirection = 'column';
  toggleList.style.gap = 'var(--space-2)';

  toggleList.appendChild(Toggle({ label: 'Default Off', checked: false, visualState: 'default' }));
  toggleList.appendChild(Toggle({ label: 'Default On', checked: true, visualState: 'default' }));
  toggleList.appendChild(
    Toggle({ label: 'Keyboard Focus State', checked: true, visualState: 'focus' }),
  );
  toggleList.appendChild(
    Toggle({ label: 'Disabled Off', checked: false, visualState: 'disabled' }),
  );
  toggleList.appendChild(Toggle({ label: 'Disabled On', checked: true, visualState: 'disabled' }));

  toggleBox.appendChild(toggleList);
  formGrid.appendChild(toggleBox);

  // Slider states
  const sliderBox = document.createElement('div');
  sliderBox.innerHTML =
    '<h4 style="font-size: var(--fs-14); text-transform: uppercase; color: var(--text-secondary); margin-bottom: var(--space-3);">Slider States</h4>';
  const sliderList = document.createElement('div');
  sliderList.style.display = 'flex';
  sliderList.style.flexDirection = 'column';
  sliderList.style.gap = 'var(--space-3)';

  sliderList.appendChild(Slider({ label: 'Master Volume', value: 75, visualState: 'default' }));
  sliderList.appendChild(
    Slider({ label: 'Steering Sensitivity (Focus)', value: 50, visualState: 'focus' }),
  );
  sliderList.appendChild(
    Slider({ label: 'Deadzone (Disabled)', value: 10, visualState: 'disabled' }),
  );

  sliderBox.appendChild(sliderList);
  formGrid.appendChild(sliderBox);

  formSection.appendChild(formGrid);
  page.appendChild(formSection);

  // 9. Section: Progress Bar
  const progressSection = createSection(
    '08. Progress Bar',
    'Determinate progress metrics (XP, download, install) and indeterminate activity animations.',
  );
  const progressGrid = document.createElement('div');
  progressGrid.className = 'sg-grid';

  const detBox = document.createElement('div');
  detBox.innerHTML =
    '<h4 style="font-size: var(--fs-14); text-transform: uppercase; color: var(--text-secondary); margin-bottom: var(--space-3);">Determinate</h4>';
  detBox.style.display = 'flex';
  detBox.style.flexDirection = 'column';
  detBox.style.gap = 'var(--space-3)';
  detBox.appendChild(ProgressBar({ label: 'Asset Download', value: 25 }));
  detBox.appendChild(ProgressBar({ label: 'Career XP', value: 65 }));
  detBox.appendChild(ProgressBar({ label: 'Engine Tune Complete', value: 100 }));
  progressGrid.appendChild(detBox);

  const indetBox = document.createElement('div');
  indetBox.innerHTML =
    '<h4 style="font-size: var(--fs-14); text-transform: uppercase; color: var(--text-secondary); margin-bottom: var(--space-3);">Indeterminate</h4>';
  indetBox.style.display = 'flex';
  indetBox.style.flexDirection = 'column';
  indetBox.style.gap = 'var(--space-3)';
  indetBox.appendChild(
    ProgressBar({ label: 'Synchronizing Race Telemetry...', indeterminate: true }),
  );
  indetBox.appendChild(ProgressBar({ label: 'Compiling Shaders...', indeterminate: true }));
  progressGrid.appendChild(indetBox);

  progressSection.appendChild(progressGrid);
  page.appendChild(progressSection);

  // 10. Section: Interactive Playground
  const playgroundSection = createSection(
    '09. Interactive Live Playground',
    'Click, press Tab/Enter/Space, drag sliders, and toggle switches to test live keyboard accessibility and focus rings.',
  );
  const playgroundGrid = document.createElement('div');
  playgroundGrid.className = 'sg-grid';

  const interactiveForm = document.createElement('div');
  interactiveForm.style.display = 'flex';
  interactiveForm.style.flexDirection = 'column';
  interactiveForm.style.gap = 'var(--space-4)';
  interactiveForm.style.padding = 'var(--space-4)';
  interactiveForm.style.background = 'var(--surface-2)';
  interactiveForm.style.borderRadius = 'var(--radius-m)';
  interactiveForm.style.border = '1px solid var(--border)';

  const liveCounter = document.createElement('div');
  liveCounter.className = 'tabular-nums';
  liveCounter.style.fontFamily = 'var(--font-display)';
  liveCounter.style.fontSize = 'var(--fs-20)';
  liveCounter.style.color = 'var(--accent)';
  liveCounter.textContent = 'Clicks: 0';

  let clickCount = 0;
  const liveBtn = Button({
    variant: 'primary',
    label: 'Click Me Or Press Enter',
    onClick: () => {
      clickCount += 1;
      liveCounter.textContent = `Clicks: ${clickCount}`;
    },
  });

  const liveToggle = Toggle({
    label: 'Enable Nitro Boost Mode',
    checked: false,
    onChange: (checked) => {
      liveCounter.textContent = `Clicks: ${clickCount} | Nitro: ${checked ? 'ENGAGED' : 'OFF'}`;
    },
  });

  const liveSlider = Slider({
    label: 'Dynamic Throttle Response',
    value: 60,
    unit: '%',
    onChange: (val) => {
      liveCounter.textContent = `Clicks: ${clickCount} | Throttle: ${val}%`;
    },
  });

  interactiveForm.appendChild(liveCounter);
  interactiveForm.appendChild(liveBtn);
  interactiveForm.appendChild(liveToggle);
  interactiveForm.appendChild(liveSlider);

  playgroundGrid.appendChild(interactiveForm);
  playgroundSection.appendChild(playgroundGrid);
  page.appendChild(playgroundSection);

  // 11. Section: Dropdowns (Part A1)
  const dropdownSection = createSection(
    '10. Dropdowns & Selection',
    'Native-like keyboard accessible dropdowns (Enter/Space opens, Arrows move, Esc closes and returns focus). Conforms to ARIA combobox and listbox specifications with viewport containment on small screens.',
  );
  const dropdownGrid = document.createElement('div');
  dropdownGrid.className = 'sg-grid';

  const tierItems: DropdownItem[] = [
    { value: 'low', label: 'Low (30 FPS Budget)' },
    { value: 'medium', label: 'Medium (60 FPS Target)' },
    { value: 'high', label: 'High Quality (Desktop)' },
    { value: 'ultra', label: 'Ultra (Experimental)' },
  ];

  // State: Closed / Default
  const dropBox1 = document.createElement('div');
  dropBox1.innerHTML =
    '<h4 class="sg-state-label" style="margin-bottom: var(--space-2);">Closed (Default)</h4>';
  dropBox1.appendChild(
    Dropdown({
      label: 'Graphics Preset',
      items: tierItems,
      value: 'medium',
      visualState: 'default',
    }),
  );
  dropdownGrid.appendChild(dropBox1);

  // State: Open
  const dropBox2 = document.createElement('div');
  dropBox2.innerHTML =
    '<h4 class="sg-state-label" style="margin-bottom: var(--space-2);">Open State</h4>';
  dropBox2.appendChild(
    Dropdown({
      label: 'Audio Output',
      items: [
        { value: 'headphones', label: 'Headphones (Spatial Audio)' },
        { value: 'speakers', label: 'Stereo Speakers' },
        { value: 'mono', label: 'Mono Mix (Phone Speaker)' },
      ],
      value: 'headphones',
      visualState: 'open',
    }),
  );
  dropdownGrid.appendChild(dropBox2);

  // State: Focus
  const dropBox3 = document.createElement('div');
  dropBox3.innerHTML =
    '<h4 class="sg-state-label" style="margin-bottom: var(--space-2);">Focus State</h4>';
  dropBox3.appendChild(
    Dropdown({
      label: 'Control Scheme',
      items: [
        { value: 'keyboard', label: 'Keyboard (WASD / Arrows)' },
        { value: 'gamepad', label: 'Gamepad (Xbox / DualSense)' },
        { value: 'touch', label: 'On-Screen Touch Controls' },
      ],
      value: 'keyboard',
      visualState: 'focus',
    }),
  );
  dropdownGrid.appendChild(dropBox3);

  // State: Disabled
  const dropBox4 = document.createElement('div');
  dropBox4.innerHTML =
    '<h4 class="sg-state-label" style="margin-bottom: var(--space-2);">Disabled State</h4>';
  dropBox4.appendChild(
    Dropdown({
      label: 'Ray Tracing Reflections',
      items: [{ value: 'unsupported', label: 'Hardware Acceleration Unavailable' }],
      value: 'unsupported',
      disabled: true,
      visualState: 'disabled',
    }),
  );
  dropdownGrid.appendChild(dropBox4);

  // Interactive Live Dropdown
  const dropBoxLive = document.createElement('div');
  dropBoxLive.style.gridColumn = '1 / -1';
  dropBoxLive.style.padding = 'var(--space-4)';
  dropBoxLive.style.background = 'var(--surface-2)';
  dropBoxLive.style.border = '1px solid var(--border)';
  dropBoxLive.style.borderRadius = 'var(--radius-m)';

  const liveDropReadout = document.createElement('div');
  liveDropReadout.style.fontFamily = 'var(--font-display)';
  liveDropReadout.style.fontSize = 'var(--fs-14)';
  liveDropReadout.style.color = 'var(--accent)';
  liveDropReadout.style.marginBottom = 'var(--space-3)';
  liveDropReadout.textContent = 'Selected Language: English (US)';

  const liveDropdown = Dropdown({
    label: 'Interactive Language Switcher',
    items: [
      { value: 'en', label: 'English (US)' },
      { value: 'ja', label: '日本語 (Japanese)' },
      { value: 'de', label: 'Deutsch (German)' },
      { value: 'es', label: 'Español (Spanish)' },
      { value: 'fr', label: 'Français (French)' },
    ],
    value: 'en',
    onChange: (val) => {
      liveDropReadout.textContent = `Selected Language: ${val.toUpperCase()}`;
    },
  });

  dropBoxLive.appendChild(liveDropReadout);
  dropBoxLive.appendChild(liveDropdown);
  dropdownGrid.appendChild(dropBoxLive);

  dropdownSection.appendChild(dropdownGrid);
  page.appendChild(dropdownSection);

  // 12. Section: Tabs (Part A2)
  const tabsSection = createSection(
    '11. Navigation Tabs',
    'Tab navigation supporting keyboard arrow navigation (Left/Right/Up/Down), Home/End focus jumps, and full ARIA tablist/tab/tabpanel associations.',
  );
  const tabsGrid = document.createElement('div');
  tabsGrid.className = 'sg-grid';

  const tabItems: TabItem[] = [
    {
      id: 'tab-handling',
      label: 'Handling & Grip',
      content:
        '<div style="padding: var(--space-3); background: var(--surface-1); border-radius: var(--radius-s); font-size: var(--fs-14); color: var(--text-secondary); line-height: 1.5;">Configures front tire lateral stiffness, rear drift breakaway threshold, and downforce aerodynamics for high-speed corners.</div>',
    },
    {
      id: 'tab-powertrain',
      label: 'Powertrain',
      content:
        '<div style="padding: var(--space-3); background: var(--surface-1); border-radius: var(--radius-s); font-size: var(--fs-14); color: var(--text-secondary); line-height: 1.5;">Twin-turbo hybrid torque curve tuned for instantaneous acceleration out of hairpins. Max power output: 620 HP.</div>',
    },
    {
      id: 'tab-chassis',
      label: 'Chassis & Weight',
      content:
        '<div style="padding: var(--space-3); background: var(--surface-1); border-radius: var(--radius-s); font-size: var(--fs-14); color: var(--text-secondary); line-height: 1.5;">Carbon composite monocoque chassis weighing 1,220 kg with 48:52 balanced weight distribution.</div>',
    },
    {
      id: 'tab-telemetry',
      label: 'Telemetry (Locked)',
      disabled: true,
      content: '<div>Locked</div>',
    },
  ];

  const tabsBox = document.createElement('div');
  tabsBox.style.gridColumn = '1 / -1';
  tabsBox.style.padding = 'var(--space-4)';
  tabsBox.style.background = 'var(--surface-2)';
  tabsBox.style.border = '1px solid var(--border)';
  tabsBox.style.borderRadius = 'var(--radius-m)';
  tabsBox.appendChild(Tabs({ items: tabItems, activeId: 'tab-handling' }));
  tabsGrid.appendChild(tabsBox);

  tabsSection.appendChild(tabsGrid);
  page.appendChild(tabsSection);

  // 13. Section: Modals & Dialogs (Part A3)
  const modalSection = createSection(
    '12. Modals & Dialog Overlays',
    'Accessible dialog overlays featuring focus trap, Esc key dismiss, background scroll lock, and return of focus to opener. Responsive down to 320px width and short phone landscape (667x375).',
  );
  const modalGrid = document.createElement('div');
  modalGrid.className = 'sg-grid';

  // Static preview: Enter state
  const modalBoxEnter = document.createElement('div');
  modalBoxEnter.innerHTML =
    '<h4 class="sg-state-label" style="margin-bottom: var(--space-2);">Enter State Preview</h4>';
  modalBoxEnter.appendChild(
    Modal({
      title: 'Upgrade Turbos',
      content:
        '<p>Install Stage 2 Twin Scroll Turbos to increase boost by +14 PSI and +45 kW peak power.</p>',
      confirmLabel: 'Install ($12,500)',
      cancelLabel: 'Later',
      visualState: 'enter',
      isStatic: true,
    }),
  );
  modalGrid.appendChild(modalBoxEnter);

  // Static preview: Idle state
  const modalBoxIdle = document.createElement('div');
  modalBoxIdle.innerHTML =
    '<h4 class="sg-state-label" style="margin-bottom: var(--space-2);">Idle State Preview</h4>';
  modalBoxIdle.appendChild(
    Modal({
      title: 'Restart Race Session',
      content:
        '<p>Restarting will forfeit current race position and split times. Do you wish to continue?</p>',
      confirmLabel: 'Restart Session',
      cancelLabel: 'Resume',
      visualState: 'idle',
      isStatic: true,
    }),
  );
  modalGrid.appendChild(modalBoxIdle);

  // Static preview: Exit state
  const modalBoxExit = document.createElement('div');
  modalBoxExit.innerHTML =
    '<h4 class="sg-state-label" style="margin-bottom: var(--space-2);">Exit State Preview</h4>';
  modalBoxExit.appendChild(
    Modal({
      title: 'Dismissing Dialog',
      content: '<p>Smooth fade and scale transition during exit.</p>',
      cancelLabel: 'Close',
      visualState: 'exit',
      isStatic: true,
    }),
  );
  modalGrid.appendChild(modalBoxExit);

  // Interactive Live Modal Trigger
  const modalLiveBox = document.createElement('div');
  modalLiveBox.style.gridColumn = '1 / -1';
  modalLiveBox.style.padding = 'var(--space-4)';
  modalLiveBox.style.background = 'var(--surface-2)';
  modalLiveBox.style.border = '1px solid var(--border)';
  modalLiveBox.style.borderRadius = 'var(--radius-m)';
  modalLiveBox.style.display = 'flex';
  modalLiveBox.style.flexDirection = 'column';
  modalLiveBox.style.gap = 'var(--space-3)';

  const liveModalInfo = document.createElement('p');
  liveModalInfo.style.fontSize = 'var(--fs-14)';
  liveModalInfo.style.color = 'var(--text-secondary)';
  liveModalInfo.textContent =
    'Click below to open a full interactive modal dialog with focus trapping, Escape dismiss, and background scroll lock:';
  modalLiveBox.appendChild(liveModalInfo);

  const realModal = Modal({
    title: 'Race Telemetry & Tuning',
    content: `
      <p style="margin-bottom: var(--space-3);">This modal is fully accessible. Try tabbing through interactive elements — focus is securely trapped inside. Press <kbd style="background: var(--surface-1); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border);">Esc</kbd> or click Close to dismiss and return focus to the opener button.</p>
      <div style="display: flex; flex-direction: column; gap: var(--space-2); margin-top: var(--space-3);">
        <label style="font-size: var(--fs-12); color: var(--text-secondary); text-transform: uppercase;">Brake Bias Distribution:</label>
        <input type="range" min="40" max="70" value="56" style="width: 100%; accent-color: var(--accent);" />
      </div>
    `,
    confirmLabel: 'Save Tuning',
    cancelLabel: 'Cancel',
    onConfirm: () => {
      showToast({ message: 'Tuning configuration saved successfully!', variant: 'success' });
    },
  });

  const launchModalBtn = Button({
    variant: 'primary',
    label: 'Launch Interactive Modal',
    onClick: () => {
      realModal.open(launchModalBtn);
    },
  });
  modalLiveBox.appendChild(launchModalBtn);
  modalGrid.appendChild(modalLiveBox);

  modalSection.appendChild(modalGrid);
  page.appendChild(modalSection);

  // 14. Section: Toasts (Part A4)
  const toastSection = createSection(
    '13. Toast Notifications',
    'Safe-area aware corner notifications with auto-dismiss timers and a single polite live region (role="status") to prevent screen reader spam.',
  );
  const toastGrid = document.createElement('div');
  toastGrid.className = 'sg-grid';

  // Static preview: States & Variants
  const toastBox1 = document.createElement('div');
  toastBox1.innerHTML =
    '<h4 class="sg-state-label" style="margin-bottom: var(--space-2);">Info Variant (Idle)</h4>';
  toastBox1.appendChild(
    createToast({
      title: 'Game Saved',
      message: 'Profile synced with local storage.',
      variant: 'info',
      visualState: 'idle',
      durationMs: 0,
    }),
  );
  toastGrid.appendChild(toastBox1);

  const toastBox2 = document.createElement('div');
  toastBox2.innerHTML =
    '<h4 class="sg-state-label" style="margin-bottom: var(--space-2);">Success Variant (Idle)</h4>';
  toastBox2.appendChild(
    createToast({
      title: 'Career Milestone',
      message: 'Coastal City Highway Stage 1 unlocked!',
      variant: 'success',
      visualState: 'idle',
      durationMs: 0,
    }),
  );
  toastGrid.appendChild(toastBox2);

  const toastBox3 = document.createElement('div');
  toastBox3.innerHTML =
    '<h4 class="sg-state-label" style="margin-bottom: var(--space-2);">Warning Variant (Idle)</h4>';
  toastBox3.appendChild(
    createToast({
      title: 'Tire Wear Warning',
      message: 'Rear grip reduced by 25%.',
      variant: 'warning',
      visualState: 'idle',
      durationMs: 0,
    }),
  );
  toastGrid.appendChild(toastBox3);

  const toastBox4 = document.createElement('div');
  toastBox4.innerHTML =
    '<h4 class="sg-state-label" style="margin-bottom: var(--space-2);">Danger Variant (Idle)</h4>';
  toastBox4.appendChild(
    createToast({
      title: 'Engine Temperature Critical',
      message: 'Coolant overheating, reducing boost output.',
      variant: 'danger',
      visualState: 'idle',
      durationMs: 0,
    }),
  );
  toastGrid.appendChild(toastBox4);

  // Live Toast Triggers
  const toastLiveBox = document.createElement('div');
  toastLiveBox.style.gridColumn = '1 / -1';
  toastLiveBox.style.padding = 'var(--space-4)';
  toastLiveBox.style.background = 'var(--surface-2)';
  toastLiveBox.style.border = '1px solid var(--border)';
  toastLiveBox.style.borderRadius = 'var(--radius-m)';
  toastLiveBox.innerHTML =
    '<h4 class="sg-state-label" style="margin-bottom: var(--space-3);">Trigger Live Toasts (Appears in Bottom-Right Corner)</h4>';

  const toastBtnRow = document.createElement('div');
  toastBtnRow.style.display = 'flex';
  toastBtnRow.style.flexWrap = 'wrap';
  toastBtnRow.style.gap = 'var(--space-3)';

  toastBtnRow.appendChild(
    Button({
      variant: 'secondary',
      label: 'Post Info Toast',
      onClick: () => {
        showToast({
          title: 'Graphics Tier',
          message: 'Resolution scale adjusted to 100%.',
          variant: 'info',
        });
      },
    }),
  );

  toastBtnRow.appendChild(
    Button({
      variant: 'secondary',
      label: 'Post Success Toast',
      onClick: () => {
        showToast({
          title: 'Clean Lap Bonus',
          message: '+500 XP and $1,200 Credits awarded!',
          variant: 'success',
        });
      },
    }),
  );

  toastBtnRow.appendChild(
    Button({
      variant: 'secondary',
      label: 'Post Warning Toast',
      onClick: () => {
        showToast({
          title: 'Track Limit Exceeded',
          message: 'Lap time invalidated for corner cut.',
          variant: 'warning',
        });
      },
    }),
  );

  toastBtnRow.appendChild(
    Button({
      variant: 'secondary',
      label: 'Post Danger Toast',
      onClick: () => {
        showToast({
          title: 'Gamepad Disconnected',
          message: 'Paused session. Connect controller or press Esc.',
          variant: 'danger',
        });
      },
    }),
  );

  toastLiveBox.appendChild(toastBtnRow);
  toastGrid.appendChild(toastLiveBox);

  toastSection.appendChild(toastGrid);
  page.appendChild(toastSection);

  // 15. Section: HUD Widgets (Part B)
  const hudWidgetsSection = createSection(
    '14. HUD Telemetry Widgets (Normal & Warning States)',
    'Zero-allocation telemetry readouts with tabular figures, pointer-events none, and flash frequencies <= 3Hz (static under Reduce Motion).',
  );
  const hudWidgetsGrid = document.createElement('div');
  hudWidgetsGrid.className = 'sg-grid';

  // Speedometer Normal vs Warning
  const speedNormBox = document.createElement('div');
  speedNormBox.className = 'sg-state-item';
  speedNormBox.innerHTML = '<span class="sg-state-label">Speedometer — Normal</span>';
  speedNormBox.appendChild(Speedometer({ speed: 174, unit: 'km/h', isWarning: false }));
  hudWidgetsGrid.appendChild(speedNormBox);

  const speedWarnBox = document.createElement('div');
  speedWarnBox.className = 'sg-state-item';
  speedWarnBox.innerHTML =
    '<span class="sg-state-label">Speedometer — Warning (Redline Limiter)</span>';
  speedWarnBox.appendChild(
    Speedometer({ speed: 312, unit: 'km/h', isWarning: true, warningLabel: 'RPM LIMIT' }),
  );
  hudWidgetsGrid.appendChild(speedWarnBox);

  // Nitro Normal vs Warning
  const nitroNormBox = document.createElement('div');
  nitroNormBox.className = 'sg-state-item';
  nitroNormBox.innerHTML = '<span class="sg-state-label">Nitro Gauge — Normal</span>';
  nitroNormBox.appendChild(NitroGauge({ value: 0.85, isWarning: false }));
  hudWidgetsGrid.appendChild(nitroNormBox);

  const nitroWarnBox = document.createElement('div');
  nitroWarnBox.className = 'sg-state-item';
  nitroWarnBox.innerHTML =
    '<span class="sg-state-label">Nitro Gauge — Warning (Low / Cooldown)</span>';
  nitroWarnBox.appendChild(NitroGauge({ value: 0.12, isWarning: true, warningLabel: 'LOW NITRO' }));
  hudWidgetsGrid.appendChild(nitroWarnBox);

  // Badges Normal vs Warning
  const badgeNormBox = document.createElement('div');
  badgeNormBox.className = 'sg-state-item';
  badgeNormBox.innerHTML = '<span class="sg-state-label">Race Badges — Normal</span>';
  const badgeNormRow = document.createElement('div');
  badgeNormRow.style.display = 'flex';
  badgeNormRow.style.gap = 'var(--space-2)';
  badgeNormRow.appendChild(LapBadge({ currentLap: 2, totalLaps: 3 }));
  badgeNormRow.appendChild(PositionBadge({ position: 2, totalRacers: 6 }));
  badgeNormBox.appendChild(badgeNormRow);
  hudWidgetsGrid.appendChild(badgeNormBox);

  const badgeWarnBox = document.createElement('div');
  badgeWarnBox.className = 'sg-state-item';
  badgeWarnBox.innerHTML =
    '<span class="sg-state-label">Race Badges — Warning (Final Lap / Last Place)</span>';
  const badgeWarnRow = document.createElement('div');
  badgeWarnRow.style.display = 'flex';
  badgeWarnRow.style.gap = 'var(--space-2)';
  badgeWarnRow.appendChild(LapBadge({ currentLap: 3, totalLaps: 3, isWarning: true }));
  badgeWarnRow.appendChild(PositionBadge({ position: 6, totalRacers: 6, isWarning: true }));
  badgeWarnBox.appendChild(badgeWarnRow);
  hudWidgetsGrid.appendChild(badgeWarnBox);

  // Minimap Normal vs Warning
  const minimapNormBox = document.createElement('div');
  minimapNormBox.className = 'sg-state-item';
  minimapNormBox.innerHTML = '<span class="sg-state-label">Minimap Radar — Normal</span>';
  minimapNormBox.appendChild(Minimap({ isWarning: false }));
  hudWidgetsGrid.appendChild(minimapNormBox);

  const minimapWarnBox = document.createElement('div');
  minimapWarnBox.className = 'sg-state-item';
  minimapWarnBox.innerHTML =
    '<span class="sg-state-label">Minimap Radar — Warning (Wrong Way Alert)</span>';
  minimapWarnBox.appendChild(Minimap({ isWarning: true, warningLabel: 'WRONG WAY' }));
  hudWidgetsGrid.appendChild(minimapWarnBox);

  hudWidgetsSection.appendChild(hudWidgetsGrid);
  page.appendChild(hudWidgetsSection);

  // 16. Section: Responsive HUD Preview & Simulation (Part C)
  const hudPreviewSection = createSection(
    '15. HUD Layout Preview & Real-Time Simulator',
    'Preview the complete corner-anchored HUD (.hud-root) across standard aspect ratios (4:3, 16:9, 21:9, and 2:1 Phone Landscape) with container query responsive scaling. Drive all frames simultaneously using the simulator controls below.',
  );

  // Simulator Controls
  let simSpeed = 195;
  let simUnit: SpeedUnit = 'km/h';
  let simNitro = 0.72;
  let simWarning = false;
  let simLap = 2;
  const simTotalLaps = 3;
  let simPosition = 3;
  const simTotalRacers = 6;

  interface FrameWidgets {
    speedometer: SpeedometerWidget;
    nitro: NitroGaugeWidget;
    lap: LapBadgeWidget;
    pos: PositionBadgeWidget;
    minimap: MinimapWidget;
  }
  const previewInstances: FrameWidgets[] = [];

  function updateAllFrames(): void {
    previewInstances.forEach((frame) => {
      frame.speedometer.setSpeed(simSpeed, simUnit);
      frame.speedometer.setWarning(simWarning);
      frame.nitro.setValue(simNitro);
      frame.nitro.setWarning(simWarning || simNitro <= 0.15);
      frame.lap.setLap(simLap, simTotalLaps);
      frame.lap.setWarning(simWarning || simLap >= simTotalLaps);
      frame.pos.setPosition(simPosition, simTotalRacers);
      frame.pos.setWarning(simWarning || simPosition >= simTotalRacers);
      frame.minimap.setWarning(simWarning);
    });
  }

  const simControls = document.createElement('div');
  simControls.className = 'sg-hud-sim-controls';

  // Speed control
  const speedItem = document.createElement('div');
  speedItem.className = 'sg-hud-sim-item';
  speedItem.appendChild(
    Slider({
      label: 'Simulated Speed',
      min: 0,
      max: 320,
      step: 1,
      value: simSpeed,
      unit: ` ${simUnit.toUpperCase()}`,
      onChange: (val) => {
        simSpeed = val;
        updateAllFrames();
      },
    }),
  );
  simControls.appendChild(speedItem);

  // Unit control
  const unitItem = document.createElement('div');
  unitItem.className = 'sg-hud-sim-item';
  unitItem.appendChild(
    Dropdown({
      label: 'Speed Units',
      items: [
        { value: 'km/h', label: 'KM/H (Metric)' },
        { value: 'mph', label: 'MPH (Imperial)' },
      ],
      value: simUnit,
      onChange: (val) => {
        simUnit = val as SpeedUnit;
        updateAllFrames();
      },
    }),
  );
  simControls.appendChild(unitItem);

  // Nitro control
  const nitroItem = document.createElement('div');
  nitroItem.className = 'sg-hud-sim-item';
  nitroItem.appendChild(
    Slider({
      label: 'Nitro Tank Level',
      min: 0,
      max: 100,
      step: 1,
      value: Math.round(simNitro * 100),
      unit: '%',
      onChange: (val) => {
        simNitro = val / 100;
        updateAllFrames();
      },
    }),
  );
  simControls.appendChild(nitroItem);

  // Warning state toggle
  const warnItem = document.createElement('div');
  warnItem.className = 'sg-hud-sim-item';
  warnItem.style.justifyContent = 'flex-end';
  warnItem.appendChild(
    Toggle({
      label: 'Force Warning States',
      checked: simWarning,
      onChange: (checked) => {
        simWarning = checked;
        updateAllFrames();
      },
    }),
  );
  simControls.appendChild(warnItem);

  // Lap selector
  const lapItem = document.createElement('div');
  lapItem.className = 'sg-hud-sim-item';
  lapItem.appendChild(
    Dropdown({
      label: 'Lap Selector',
      items: [
        { value: '1', label: 'Lap 1 / 3' },
        { value: '2', label: 'Lap 2 / 3' },
        { value: '3', label: 'Lap 3 / 3 (Final Lap)' },
      ],
      value: '2',
      onChange: (val) => {
        simLap = parseInt(val, 10);
        updateAllFrames();
      },
    }),
  );
  simControls.appendChild(lapItem);

  // Position selector
  const posItem = document.createElement('div');
  posItem.className = 'sg-hud-sim-item';
  posItem.appendChild(
    Dropdown({
      label: 'Race Position',
      items: [
        { value: '1', label: '1st (Leader)' },
        { value: '2', label: '2nd' },
        { value: '3', label: '3rd' },
        { value: '6', label: '6th (Last Place)' },
      ],
      value: '3',
      onChange: (val) => {
        simPosition = parseInt(val, 10);
        updateAllFrames();
      },
    }),
  );
  simControls.appendChild(posItem);

  hudPreviewSection.appendChild(simControls);

  // Frames Grid (4:3, 16:9, 21:9, Phone 2:1)
  const framesGrid = document.createElement('div');
  framesGrid.className = 'sg-hud-frames-grid';
  framesGrid.style.marginTop = 'var(--space-5)';

  const aspectConfigs: Array<{ label: string; aspectClass: string; desc: string }> = [
    { label: '4:3 — iPad / Classic', aspectClass: 'sg-hud-frame--4-3', desc: '800 × 600' },
    { label: '16:9 — Standard Widescreen', aspectClass: 'sg-hud-frame--16-9', desc: '800 × 450' },
    { label: '21:9 — Ultrawide Monitor', aspectClass: 'sg-hud-frame--21-9', desc: '840 × 360' },
    { label: '2:1 — Modern Smartphone', aspectClass: 'sg-hud-frame--phone', desc: '720 × 360' },
  ];

  aspectConfigs.forEach((cfg) => {
    const card = document.createElement('div');
    card.className = 'sg-hud-frame-card';

    const cardHeader = document.createElement('div');
    cardHeader.className = 'sg-hud-frame-header';
    cardHeader.innerHTML = `<span>${cfg.label}</span><span class="sg-hud-frame-badge">${cfg.desc}</span>`;
    card.appendChild(cardHeader);

    const frame = document.createElement('div');
    frame.className = `sg-hud-frame ${cfg.aspectClass}`;

    // HUD Root
    const hudRoot = document.createElement('div');
    hudRoot.className = 'hud-root';

    // Top Left: Lap and Position badges
    const topLeft = document.createElement('div');
    topLeft.className = 'hud-anchor-top-left';
    const lapWidget = LapBadge({ currentLap: simLap, totalLaps: simTotalLaps });
    const posWidget = PositionBadge({ position: simPosition, totalRacers: simTotalRacers });
    topLeft.appendChild(lapWidget.element);
    topLeft.appendChild(posWidget.element);
    hudRoot.appendChild(topLeft);

    // Top Right: Minimap
    const topRight = document.createElement('div');
    topRight.className = 'hud-anchor-top-right';
    const minimapWidget = Minimap({ isWarning: simWarning });
    topRight.appendChild(minimapWidget.element);
    hudRoot.appendChild(topRight);

    // Bottom Left: Nitro Gauge
    const bottomLeft = document.createElement('div');
    bottomLeft.className = 'hud-anchor-bottom-left';
    const nitroWidget = NitroGauge({ value: simNitro, isWarning: simWarning });
    bottomLeft.appendChild(nitroWidget.element);
    hudRoot.appendChild(bottomLeft);

    // Bottom Right: Speedometer
    const bottomRight = document.createElement('div');
    bottomRight.className = 'hud-anchor-bottom-right';
    const speedWidget = Speedometer({ speed: simSpeed, unit: simUnit, isWarning: simWarning });
    bottomRight.appendChild(speedWidget.element);
    hudRoot.appendChild(bottomRight);

    frame.appendChild(hudRoot);
    card.appendChild(frame);
    framesGrid.appendChild(card);

    previewInstances.push({
      speedometer: speedWidget,
      nitro: nitroWidget,
      lap: lapWidget,
      pos: posWidget,
      minimap: minimapWidget,
    });
  });

  hudPreviewSection.appendChild(framesGrid);
  page.appendChild(hudPreviewSection);

  root.appendChild(page);
}

function createSection(titleText: string, descriptionText: string): HTMLElement {
  const section = document.createElement('section');
  section.className = 'sg-section';

  const secHeader = document.createElement('div');
  secHeader.className = 'sg-section__header';

  const title = document.createElement('h2');
  title.className = 'sg-section__title';
  title.textContent = titleText;
  secHeader.appendChild(title);

  const desc = document.createElement('p');
  desc.className = 'sg-section__desc';
  desc.textContent = descriptionText;
  secHeader.appendChild(desc);

  section.appendChild(secHeader);
  return section;
}

export { initStyleguide as Styleguide };
