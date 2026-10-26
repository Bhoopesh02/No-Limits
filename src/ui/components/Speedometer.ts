import { convertSpeed, SpeedUnit } from '../../core/convertSpeed';

export interface SpeedometerOptions {
  readonly speed?: number;
  readonly unit?: SpeedUnit;
  readonly isWarning?: boolean;
  readonly warningLabel?: string;
  readonly isReversing?: boolean;
}

export interface SpeedometerWidget {
  readonly element: HTMLElement;
  setSpeed(speedKmh: number, unit?: SpeedUnit): void;
  setWarning(isWarning: boolean, label?: string): void;
  setReversing(isReversing: boolean): void;
}

export type SpeedometerElement = HTMLElement & SpeedometerWidget;

export function formatSpeedometerDisplay(
  speedKmh: number,
  unit: SpeedUnit = 'km/h',
  isReversing = false,
): {
  displaySpeed: number;
  unitLabel: string;
  gearLabel: string;
  isReversing: boolean;
} {
  return {
    displaySpeed: Math.abs(convertSpeed(speedKmh, unit)),
    unitLabel: unit.toUpperCase(),
    gearLabel: isReversing ? 'R' : '',
    isReversing,
  };
}

export function createSpeedometer(options: SpeedometerOptions = {}): SpeedometerElement {
  const {
    speed = 0,
    unit = 'km/h',
    isWarning = false,
    warningLabel = 'RPM LIMIT',
    isReversing = false,
  } = options;

  if (typeof document === 'undefined') {
    return {
      element: {} as HTMLElement,
      setSpeed: () => {},
      setWarning: () => {},
      setReversing: () => {},
    } as unknown as SpeedometerElement;
  }

  let currentUnit: SpeedUnit = unit;
  let cachedSpeed = -1;
  let cachedWarning = isWarning;
  let cachedWarningLabel = warningLabel;
  let cachedReversing = isReversing;

  const container = document.createElement('div');
  container.className = `nl-hud-speedometer${isWarning ? ' is-warning' : ''}${isReversing ? ' is-reversing' : ''}`;
  container.style.pointerEvents = 'none';

  // Value and unit container
  const row = document.createElement('div');
  row.className = 'nl-hud-speedometer__row';

  const valueEl = document.createElement('span');
  valueEl.className = 'nl-hud-speedometer__value tabular-nums';

  // Always display absolute speed
  const displaySpeed = Math.abs(convertSpeed(speed, currentUnit));
  cachedSpeed = displaySpeed;
  valueEl.textContent = displaySpeed.toString();
  row.appendChild(valueEl);

  const metaCol = document.createElement('div');
  metaCol.className = 'nl-hud-speedometer__meta';

  const unitEl = document.createElement('span');
  unitEl.className = 'nl-hud-speedometer__unit';
  unitEl.textContent = currentUnit.toUpperCase();
  metaCol.appendChild(unitEl);

  const gearEl = document.createElement('span');
  gearEl.className = 'nl-hud-speedometer__gear';
  gearEl.textContent = isReversing ? 'R' : '';
  gearEl.style.display = isReversing ? 'inline-flex' : 'none';
  metaCol.appendChild(gearEl);

  const warnEl = document.createElement('span');
  warnEl.className = 'nl-hud-speedometer__warn-label';
  warnEl.textContent = warningLabel;
  warnEl.style.display = isWarning ? 'inline-flex' : 'none';
  metaCol.appendChild(warnEl);

  row.appendChild(metaCol);
  container.appendChild(row);

  function setSpeed(speedKmh: number, newUnit?: SpeedUnit): void {
    const targetUnit = newUnit ?? currentUnit;
    // Always display absolute speed
    const converted = Math.abs(convertSpeed(speedKmh, targetUnit));

    if (converted === cachedSpeed && targetUnit === currentUnit) {
      return;
    }

    if (targetUnit !== currentUnit) {
      currentUnit = targetUnit;
      unitEl.textContent = currentUnit.toUpperCase();
    }

    cachedSpeed = converted;
    valueEl.textContent = converted.toString();
  }

  function setWarning(warning: boolean, label?: string): void {
    const nextLabel = label ?? cachedWarningLabel;
    if (warning === cachedWarning && nextLabel === cachedWarningLabel) {
      return;
    }

    cachedWarning = warning;
    cachedWarningLabel = nextLabel;
    warnEl.textContent = nextLabel;

    if (warning) {
      container.classList.add('is-warning');
      warnEl.style.display = 'inline-flex';
    } else {
      container.classList.remove('is-warning');
      warnEl.style.display = 'none';
    }
  }

  function setReversing(reversing: boolean): void {
    if (reversing === cachedReversing) {
      return;
    }

    cachedReversing = reversing;
    if (reversing) {
      container.classList.add('is-reversing');
      gearEl.textContent = 'R';
      gearEl.style.display = 'inline-flex';
    } else {
      container.classList.remove('is-reversing');
      gearEl.textContent = '';
      gearEl.style.display = 'none';
    }
  }

  const widget = container as unknown as SpeedometerElement;
  Object.defineProperties(widget, {
    element: { value: container, writable: false },
    setSpeed: { value: setSpeed, writable: false },
    setWarning: { value: setWarning, writable: false },
    setReversing: { value: setReversing, writable: false },
  });

  return widget;
}

export { createSpeedometer as Speedometer };
