import { formatOrdinal } from '../../core/formatOrdinal';

export interface PositionBadgeOptions {
  readonly position?: number;
  readonly totalRacers?: number;
  readonly isWarning?: boolean;
}

export interface PositionBadgeWidget {
  readonly element: HTMLElement;
  setPosition(pos: number, total: number): void;
  setWarning(isWarning: boolean): void;
}

export type PositionBadgeElement = HTMLElement & PositionBadgeWidget;

export function createPositionBadge(options: PositionBadgeOptions = {}): PositionBadgeElement {
  const { position = 1, totalRacers = 6, isWarning = false } = options;

  let cachedPos = -1;
  let cachedTotal = -1;
  let cachedWarning = isWarning;

  const container = document.createElement('div');
  container.className = `nl-hud-badge nl-hud-badge--pos${isWarning ? ' is-warning' : ''}`;
  container.style.pointerEvents = 'none';

  const labelEl = document.createElement('span');
  labelEl.className = 'nl-hud-badge__label';
  labelEl.textContent = 'POS';
  container.appendChild(labelEl);

  const valueEl = document.createElement('span');
  valueEl.className = 'nl-hud-badge__value tabular-nums';
  container.appendChild(valueEl);

  const totalEl = document.createElement('span');
  totalEl.className = 'nl-hud-badge__total tabular-nums';
  container.appendChild(totalEl);

  const warnTag = document.createElement('span');
  warnTag.className = 'nl-hud-badge__warn-tag';
  warnTag.textContent = 'LAST';
  warnTag.style.display = isWarning ? 'inline-block' : 'none';
  container.appendChild(warnTag);

  function setPosition(pos: number, total: number): void {
    if (pos === cachedPos && total === cachedTotal) {
      return;
    }
    cachedPos = pos;
    cachedTotal = total;

    valueEl.textContent = formatOrdinal(pos);
    totalEl.textContent = `/ ${total}`;

    const isLast = pos >= total && total > 1;
    if (isLast && !cachedWarning) {
      setWarning(true);
    } else if (!isLast && cachedWarning) {
      setWarning(false);
    }
  }

  function setWarning(warning: boolean): void {
    if (warning === cachedWarning) return;
    cachedWarning = warning;
    if (warning) {
      container.classList.add('is-warning');
      warnTag.style.display = 'inline-block';
    } else {
      container.classList.remove('is-warning');
      warnTag.style.display = 'none';
    }
  }

  setPosition(position, totalRacers);
  if (isWarning) setWarning(true);

  const widget = container as unknown as PositionBadgeElement;
  Object.defineProperties(widget, {
    element: { value: container, writable: false },
    setPosition: { value: setPosition, writable: false },
    setWarning: { value: setWarning, writable: false },
  });

  return widget;
}

export { createPositionBadge as PositionBadge };
