export interface LapBadgeOptions {
  readonly currentLap?: number;
  readonly totalLaps?: number;
  readonly isWarning?: boolean;
}

export interface LapBadgeWidget {
  readonly element: HTMLElement;
  setLap(current: number, total: number): void;
  setWarning(isWarning: boolean): void;
}

export type LapBadgeElement = HTMLElement & LapBadgeWidget;

export function createLapBadge(options: LapBadgeOptions = {}): LapBadgeElement {
  const { currentLap = 1, totalLaps = 3, isWarning = false } = options;

  let cachedLap = -1;
  let cachedTotal = -1;
  let cachedWarning = isWarning;

  const container = document.createElement('div');
  container.className = `nl-hud-badge nl-hud-badge--lap${isWarning ? ' is-warning' : ''}`;
  container.style.pointerEvents = 'none';

  const labelEl = document.createElement('span');
  labelEl.className = 'nl-hud-badge__label';
  labelEl.textContent = 'LAP';
  container.appendChild(labelEl);

  const valueEl = document.createElement('span');
  valueEl.className = 'nl-hud-badge__value tabular-nums';
  container.appendChild(valueEl);

  const warnIndicator = document.createElement('span');
  warnIndicator.className = 'nl-hud-badge__warn-tag';
  warnIndicator.textContent = 'FINAL';
  warnIndicator.style.display = isWarning ? 'inline-block' : 'none';
  container.appendChild(warnIndicator);

  function setLap(current: number, total: number): void {
    if (current === cachedLap && total === cachedTotal) {
      return;
    }
    cachedLap = current;
    cachedTotal = total;
    valueEl.textContent = `${current}/${total}`;

    const isFinal = current >= total && total > 1;
    if (isFinal && !cachedWarning) {
      setWarning(true);
    } else if (!isFinal && cachedWarning) {
      setWarning(false);
    }
  }

  function setWarning(warning: boolean): void {
    if (warning === cachedWarning) return;
    cachedWarning = warning;
    if (warning) {
      container.classList.add('is-warning');
      warnIndicator.style.display = 'inline-block';
    } else {
      container.classList.remove('is-warning');
      warnIndicator.style.display = 'none';
    }
  }

  setLap(currentLap, totalLaps);
  if (isWarning) setWarning(true);

  const widget = container as unknown as LapBadgeElement;
  Object.defineProperties(widget, {
    element: { value: container, writable: false },
    setLap: { value: setLap, writable: false },
    setWarning: { value: setWarning, writable: false },
  });

  return widget;
}

export { createLapBadge as LapBadge };
