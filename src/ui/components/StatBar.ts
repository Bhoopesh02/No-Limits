export type StatBarState = 'normal' | 'upgraded';

export interface StatBarOptions {
  readonly label: string;
  readonly current: number;
  readonly max?: number;
  readonly unit?: string;
  readonly upgrade?: number;
  readonly state?: StatBarState;
}

export function createStatBar(options: StatBarOptions): HTMLElement {
  const { label, current, max = 100, unit = '', upgrade = 0, state = 'normal' } = options;

  const container = document.createElement('div');
  container.className = 'nl-stat-bar';
  container.setAttribute('role', 'meter');
  container.setAttribute('aria-label', label);
  container.setAttribute('aria-valuemin', '0');
  container.setAttribute('aria-valuemax', max.toString());
  const effectiveVal = state === 'upgraded' ? current + upgrade : current;
  container.setAttribute('aria-valuenow', effectiveVal.toString());

  // Header row
  const header = document.createElement('div');
  header.className = 'nl-stat-bar__header';

  const labelEl = document.createElement('span');
  labelEl.className = 'nl-stat-bar__label';
  labelEl.textContent = label;
  header.appendChild(labelEl);

  const valuesEl = document.createElement('div');
  valuesEl.className = 'nl-stat-bar__values';

  const currentSpan = document.createElement('span');
  currentSpan.className = 'nl-stat-bar__current';
  currentSpan.textContent = `${current}${unit ? ` ${unit}` : ''}`;
  valuesEl.appendChild(currentSpan);

  if (state === 'upgraded' && upgrade > 0) {
    const deltaSpan = document.createElement('span');
    deltaSpan.className = 'nl-stat-bar__delta';
    deltaSpan.textContent = ` (+${upgrade}${unit ? ` ${unit}` : ''})`;
    valuesEl.appendChild(deltaSpan);
  }

  header.appendChild(valuesEl);
  container.appendChild(header);

  // Meter track
  const track = document.createElement('div');
  track.className = 'nl-stat-bar__track';

  const basePercent = Math.min(100, Math.max(0, (current / max) * 100));
  const baseFill = document.createElement('div');
  baseFill.className = 'nl-stat-bar__fill-base';
  baseFill.style.width = `${basePercent}%`;
  track.appendChild(baseFill);

  if (state === 'upgraded' && upgrade > 0) {
    const upgradePercent = Math.min(100 - basePercent, Math.max(0, (upgrade / max) * 100));
    const upgradeFill = document.createElement('div');
    upgradeFill.className = 'nl-stat-bar__fill-upgrade';
    upgradeFill.style.width = `${upgradePercent}%`;
    track.appendChild(upgradeFill);
  }

  container.appendChild(track);

  return container;
}

export { createStatBar as StatBar };
