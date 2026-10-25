import './styleguide.css';
import { GameInfo } from '../../data/GameInfo';
import { UiTheme } from '../../data/UiTheme';
import { Button, ButtonVariant, ButtonVisualState } from '../components/Button';
import { CarCard } from '../components/CarCard';
import { ProgressBar } from '../components/ProgressBar';
import { Slider } from '../components/Slider';
import { StatBar } from '../components/StatBar';
import { Toggle } from '../components/Toggle';
import { TrackCard } from '../components/TrackCard';

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
