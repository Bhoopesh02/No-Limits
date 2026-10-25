export interface ProgressBarOptions {
  readonly label?: string;
  readonly value?: number;
  readonly indeterminate?: boolean;
}

export function createProgressBar(options: ProgressBarOptions = {}): HTMLElement {
  const { label = 'Loading', value = 0, indeterminate = false } = options;

  const container = document.createElement('div');
  container.className = 'nl-progress-bar';
  container.setAttribute('role', 'progressbar');
  container.setAttribute('aria-label', label);

  if (indeterminate) {
    container.setAttribute('aria-busy', 'true');
  } else {
    container.setAttribute('aria-valuemin', '0');
    container.setAttribute('aria-valuemax', '100');
    container.setAttribute('aria-valuenow', Math.round(value).toString());
  }

  // Header row
  const header = document.createElement('div');
  header.className = 'nl-progress-bar__header';

  const labelEl = document.createElement('span');
  labelEl.className = 'nl-progress-bar__label';
  labelEl.textContent = label;
  header.appendChild(labelEl);

  const valEl = document.createElement('span');
  valEl.className = 'nl-progress-bar__value';
  valEl.textContent = indeterminate ? 'In Progress...' : `${Math.round(value)}%`;
  header.appendChild(valEl);

  container.appendChild(header);

  // Track
  const track = document.createElement('div');
  track.className = `nl-progress-bar__track${indeterminate ? ' nl-progress-bar__track--indeterminate' : ''}`;

  if (!indeterminate) {
    const fill = document.createElement('div');
    fill.className = 'nl-progress-bar__fill';
    fill.style.width = `${Math.min(100, Math.max(0, value))}%`;
    track.appendChild(fill);
  }

  container.appendChild(track);

  return container;
}

export { createProgressBar as ProgressBar };
