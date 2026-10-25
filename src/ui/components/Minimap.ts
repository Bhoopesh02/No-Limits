export interface MinimapOptions {
  readonly isWarning?: boolean;
  readonly warningLabel?: string;
}

export interface MinimapWidget {
  readonly element: HTMLElement;
  setWarning(isWarning: boolean, label?: string): void;
}

export type MinimapElement = HTMLElement & MinimapWidget;

export function createMinimap(options: MinimapOptions = {}): MinimapElement {
  const { isWarning = false, warningLabel = 'WRONG WAY' } = options;

  let cachedWarning = isWarning;
  let cachedWarningLabel = warningLabel;

  const container = document.createElement('div');
  container.className = `nl-hud-minimap${isWarning ? ' is-warning' : ''}`;
  container.style.pointerEvents = 'none';

  // Inner radar placeholder
  const inner = document.createElement('div');
  inner.className = 'nl-hud-minimap__inner';

  // Stylized placeholder radar grid
  const radarGrid = document.createElement('div');
  radarGrid.className = 'nl-hud-minimap__grid';
  radarGrid.innerHTML = `
    <svg class="nl-hud-minimap__svg" viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="46" stroke="var(--border)" stroke-width="1.5" stroke-dasharray="2 3"/>
      <circle cx="50" cy="50" r="28" stroke="var(--border)" stroke-width="1" opacity="0.6"/>
      <line x1="50" y1="4" x2="50" y2="96" stroke="var(--border)" stroke-width="1" opacity="0.4"/>
      <line x1="4" y1="50" x2="96" y2="50" stroke="var(--border)" stroke-width="1" opacity="0.4"/>
      <!-- Track placeholder spline outline -->
      <path d="M 30 75 C 15 50, 25 20, 50 18 C 75 16, 85 40, 75 70 C 65 85, 45 85, 30 75 Z" stroke="var(--accent)" stroke-width="3" fill="none" opacity="0.8"/>
      <!-- Player marker -->
      <polygon points="50,38 45,50 50,47 55,50" fill="var(--warning)" stroke="#05080f" stroke-width="1"/>
    </svg>
  `;
  inner.appendChild(radarGrid);
  container.appendChild(inner);

  // Warning Overlay / Tag
  const warnOverlay = document.createElement('div');
  warnOverlay.className = 'nl-hud-minimap__warn-overlay';
  warnOverlay.style.display = isWarning ? 'flex' : 'none';

  const warnText = document.createElement('span');
  warnText.className = 'nl-hud-minimap__warn-text';
  warnText.textContent = warningLabel;
  warnOverlay.appendChild(warnText);

  container.appendChild(warnOverlay);

  function setWarning(warning: boolean, label?: string): void {
    const nextLabel = label ?? cachedWarningLabel;
    if (warning === cachedWarning && nextLabel === cachedWarningLabel) {
      return;
    }

    cachedWarning = warning;
    cachedWarningLabel = nextLabel;
    warnText.textContent = nextLabel;

    if (warning) {
      container.classList.add('is-warning');
      warnOverlay.style.display = 'flex';
    } else {
      container.classList.remove('is-warning');
      warnOverlay.style.display = 'none';
    }
  }

  const widget = container as unknown as MinimapElement;
  Object.defineProperties(widget, {
    element: { value: container, writable: false },
    setWarning: { value: setWarning, writable: false },
  });

  return widget;
}

export { createMinimap as Minimap };
