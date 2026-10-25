export interface DriftHUDWidget {
  readonly element: HTMLElement;
  setDrift(isDrifting: boolean, score: number, multiplier: number): void;
}

export type DriftHUDElement = HTMLElement & DriftHUDWidget;

/**
 * HUD widget displaying live drift points and multiplier.
 * Follows design system HUD rules:
 * - Minimum font size 14 px
 * - Tabular numbers for score & multiplier
 * - Pointer events none
 * - Updates DOM only when displayed value changes
 * - Hides smoothly with opacity when not drifting
 * - Respects Reduce Motion
 */
export function createDriftHUD(): DriftHUDElement {
  let cachedActive = false;
  let cachedScore = -1;
  let cachedMultiplier = -1;

  const container = document.createElement('div');
  container.className = 'nl-hud-drift';
  container.style.pointerEvents = 'none';

  // Header row: "DRIFT" label + multiplier pill
  const header = document.createElement('div');
  header.className = 'nl-hud-drift__header';

  const titleEl = document.createElement('span');
  titleEl.className = 'nl-hud-drift__title';
  titleEl.textContent = 'DRIFT';
  header.appendChild(titleEl);

  const multiplierEl = document.createElement('span');
  multiplierEl.className = 'nl-hud-drift__multiplier tabular-nums';
  multiplierEl.textContent = 'x1';
  header.appendChild(multiplierEl);

  container.appendChild(header);

  // Score display
  const scoreEl = document.createElement('div');
  scoreEl.className = 'nl-hud-drift__score tabular-nums';
  scoreEl.textContent = '0';
  container.appendChild(scoreEl);

  function setDrift(isDrifting: boolean, score: number, multiplier: number): void {
    if (isDrifting !== cachedActive) {
      cachedActive = isDrifting;
      if (isDrifting) {
        container.classList.add('is-active');
      } else {
        container.classList.remove('is-active');
      }
    }

    if (isDrifting) {
      const roundedScore = Math.floor(score);
      if (roundedScore !== cachedScore) {
        cachedScore = roundedScore;
        scoreEl.textContent = roundedScore.toLocaleString();
      }

      const multInt = Math.floor(multiplier);
      if (multInt !== cachedMultiplier) {
        cachedMultiplier = multInt;
        multiplierEl.textContent = `x${multInt}`;
      }
    }
  }

  const widget = container as unknown as DriftHUDElement;
  Object.defineProperties(widget, {
    element: { value: container, writable: false },
    setDrift: { value: setDrift, writable: false },
  });

  return widget;
}

export { createDriftHUD as DriftHUD };
