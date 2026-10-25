import { clamp } from '../../core/clamp';

export interface NitroGaugeOptions {
  readonly value?: number; // 0 to 1
  readonly isWarning?: boolean;
  readonly warningLabel?: string;
}

export interface NitroGaugeWidget {
  readonly element: HTMLElement;
  setValue(ratio: number): void;
  setWarning(isWarning: boolean, label?: string): void;
}

export type NitroGaugeElement = HTMLElement & NitroGaugeWidget;

export function createNitroGauge(options: NitroGaugeOptions = {}): NitroGaugeElement {
  const { value = 1.0, isWarning = false, warningLabel = 'LOW NITRO' } = options;

  let cachedRatio = -1;
  let cachedPct = -1;
  let cachedWarning = isWarning;
  let cachedWarningLabel = warningLabel;

  const container = document.createElement('div');
  container.className = `nl-hud-nitro${isWarning ? ' is-warning' : ''}`;
  container.style.pointerEvents = 'none';

  // Header row
  const header = document.createElement('div');
  header.className = 'nl-hud-nitro__header';

  const labelGroup = document.createElement('div');
  labelGroup.className = 'nl-hud-nitro__label-group';

  const iconEl = document.createElement('span');
  iconEl.className = 'nl-hud-nitro__icon';
  iconEl.setAttribute('aria-hidden', 'true');
  iconEl.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7.5 1L2 8H7L6.5 13L12 6H7L7.5 1Z" fill="currentColor"/></svg>';
  labelGroup.appendChild(iconEl);

  const titleEl = document.createElement('span');
  titleEl.className = 'nl-hud-nitro__title';
  titleEl.textContent = 'NITRO';
  labelGroup.appendChild(titleEl);

  header.appendChild(labelGroup);

  const statusGroup = document.createElement('div');
  statusGroup.className = 'nl-hud-nitro__status-group';

  const warnBadge = document.createElement('span');
  warnBadge.className = 'nl-hud-nitro__warn-badge';
  warnBadge.textContent = warningLabel;
  warnBadge.style.display = isWarning ? 'inline-flex' : 'none';
  statusGroup.appendChild(warnBadge);

  const pctEl = document.createElement('span');
  pctEl.className = 'nl-hud-nitro__pct tabular-nums';
  statusGroup.appendChild(pctEl);

  header.appendChild(statusGroup);
  container.appendChild(header);

  // Gauge Track & Fill
  const track = document.createElement('div');
  track.className = 'nl-hud-nitro__track';

  const fill = document.createElement('div');
  fill.className = 'nl-hud-nitro__fill';
  track.appendChild(fill);

  container.appendChild(track);

  function setValue(ratio: number): void {
    const clamped = clamp(ratio, 0, 1);
    if (Math.abs(clamped - cachedRatio) < 0.002) {
      return;
    }

    cachedRatio = clamped;
    fill.style.transform = `scaleX(${clamped})`;

    const pct = Math.round(clamped * 100);
    if (pct !== cachedPct) {
      cachedPct = pct;
      pctEl.textContent = `${pct}%`;
    }
  }

  function setWarning(warning: boolean, label?: string): void {
    const nextLabel = label ?? cachedWarningLabel;
    if (warning === cachedWarning && nextLabel === cachedWarningLabel) {
      return;
    }

    cachedWarning = warning;
    cachedWarningLabel = nextLabel;
    warnBadge.textContent = nextLabel;

    if (warning) {
      container.classList.add('is-warning');
      warnBadge.style.display = 'inline-flex';
    } else {
      container.classList.remove('is-warning');
      warnBadge.style.display = 'none';
    }
  }

  setValue(value);

  const widget = container as unknown as NitroGaugeElement;
  Object.defineProperties(widget, {
    element: { value: container, writable: false },
    setValue: { value: setValue, writable: false },
    setWarning: { value: setWarning, writable: false },
  });

  return widget;
}

export { createNitroGauge as NitroGauge };
