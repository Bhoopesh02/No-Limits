import { formatLapTime } from '../../core/formatLapTime';

export interface LapTimerHUDWidget {
  readonly element: HTMLElement;
  updateTimes(currentMs: number, lastMs: number | null, bestMs: number | null): void;
}

export type LapTimerHUDElement = HTMLElement & LapTimerHUDWidget;

/**
 * HUD widget displaying Current Lap Time, Last Lap Time, and Best Lap Time.
 * Follows design system rules: >= 14px text, tabular-nums, pointer-events none,
 * DOM updated strictly when formatted text changes.
 */
export function createLapTimerHUD(): LapTimerHUDElement {
  const container = document.createElement('div');
  container.className = 'nl-hud-lap-timer';
  container.style.pointerEvents = 'none';

  // 1. Current Lap Time Row
  const currentRow = document.createElement('div');
  currentRow.className = 'nl-hud-lap-timer__row nl-hud-lap-timer__row--current';

  const currentLabel = document.createElement('span');
  currentLabel.className = 'nl-hud-lap-timer__label';
  currentLabel.textContent = 'TIME';

  const currentValue = document.createElement('span');
  currentValue.className = 'nl-hud-lap-timer__value tabular-nums';
  currentValue.textContent = '0:00.000';

  currentRow.appendChild(currentLabel);
  currentRow.appendChild(currentValue);

  // 2. Last Lap Time Row
  const lastRow = document.createElement('div');
  lastRow.className = 'nl-hud-lap-timer__row';

  const lastLabel = document.createElement('span');
  lastLabel.className = 'nl-hud-lap-timer__label';
  lastLabel.textContent = 'LAST';

  const lastValue = document.createElement('span');
  lastValue.className = 'nl-hud-lap-timer__value tabular-nums';
  lastValue.textContent = '--:--.---';

  lastRow.appendChild(lastLabel);
  lastRow.appendChild(lastValue);

  // 3. Best Lap Time Row
  const bestRow = document.createElement('div');
  bestRow.className = 'nl-hud-lap-timer__row';

  const bestLabel = document.createElement('span');
  bestLabel.className = 'nl-hud-lap-timer__label';
  bestLabel.textContent = 'BEST';

  const bestValue = document.createElement('span');
  bestValue.className = 'nl-hud-lap-timer__value nl-hud-lap-timer__value--best tabular-nums';
  bestValue.textContent = '--:--.---';

  bestRow.appendChild(bestLabel);
  bestRow.appendChild(bestValue);

  container.appendChild(currentRow);
  container.appendChild(lastRow);
  container.appendChild(bestRow);

  let cachedCurrentText = '0:00.000';
  let cachedLastText = '--:--.---';
  let cachedBestText = '--:--.---';

  function updateTimes(currentMs: number, lastMs: number | null, bestMs: number | null): void {
    const nextCurrent = formatLapTime(currentMs);
    if (nextCurrent !== cachedCurrentText) {
      cachedCurrentText = nextCurrent;
      currentValue.textContent = nextCurrent;
    }

    const nextLast = lastMs !== null ? formatLapTime(lastMs) : '--:--.---';
    if (nextLast !== cachedLastText) {
      cachedLastText = nextLast;
      lastValue.textContent = nextLast;
    }

    const nextBest = bestMs !== null ? formatLapTime(bestMs) : '--:--.---';
    if (nextBest !== cachedBestText) {
      cachedBestText = nextBest;
      bestValue.textContent = nextBest;
    }
  }

  const widget = container as unknown as LapTimerHUDElement;
  Object.defineProperties(widget, {
    element: { value: container, writable: false },
    updateTimes: { value: updateTimes, writable: false },
  });

  return widget;
}

export { createLapTimerHUD as LapTimerHUD };
