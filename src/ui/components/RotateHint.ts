export interface RotateHintElement extends HTMLElement {
  isShowing(): boolean;
  onVisibilityChange(callback: (showing: boolean) => void): void;
  dispose(): void;
}

export interface RotateHintConditions {
  isTouchForced: boolean;
  isCoarsePointer: boolean;
  isPortraitMedia: boolean;
  innerWidth: number;
  innerHeight: number;
}

export function shouldShowRotateHintGiven(conditions: RotateHintConditions): boolean {
  // Must be a touch device (or forced via ?touch=1)
  const isTouchDevice = conditions.isTouchForced || conditions.isCoarsePointer;
  if (!isTouchDevice) {
    return false;
  }

  // Portrait orientation detection via CSS media or window aspect ratio
  return conditions.isPortraitMedia || conditions.innerHeight > conditions.innerWidth;
}

export function shouldShowRotateHint(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    const isTouchForced = params.get('touch') === '1';
    const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const isPortraitMedia = window.matchMedia('(orientation: portrait)').matches;

    return shouldShowRotateHintGiven({
      isTouchForced,
      isCoarsePointer,
      isPortraitMedia,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
    });
  } catch {
    return false;
  }
}

export function createRotateHint(): RotateHintElement {
  const container = document.createElement('div') as unknown as RotateHintElement;
  container.className = 'nl-rotate-hint';
  container.setAttribute('role', 'alert');
  container.setAttribute('aria-live', 'assertive');

  container.innerHTML = `
    <div class="nl-rotate-hint__icon" aria-hidden="true">
      <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="3" ry="3"></rect>
        <line x1="12" y1="18" x2="12.01" y2="18"></line>
        <path d="M12 8a4 4 0 0 1 4 4"></path>
        <path d="M16 10l2 2-2 2"></path>
      </svg>
    </div>
    <h2 class="nl-rotate-hint__title">ROTATE YOUR DEVICE</h2>
    <p class="nl-rotate-hint__text">
      No Limits is designed for landscape mode. Please turn your phone sideways to race.
    </p>
  `;

  let listeners: ((showing: boolean) => void)[] = [];
  let isCurrentlyShowing = false;

  const update = () => {
    const nextShowing = shouldShowRotateHint();
    if (nextShowing !== isCurrentlyShowing) {
      isCurrentlyShowing = nextShowing;
      container.classList.toggle('is-hidden', !nextShowing);
      for (let i = 0; i < listeners.length; i++) {
        listeners[i](nextShowing);
      }
    }
  };

  container.isShowing = () => isCurrentlyShowing;

  container.onVisibilityChange = (callback: (showing: boolean) => void) => {
    listeners.push(callback);
    callback(isCurrentlyShowing);
  };

  container.dispose = () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    }
    listeners = [];
    if (container.parentElement) {
      container.parentElement.removeChild(container);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
  }

  // Initial check
  isCurrentlyShowing = shouldShowRotateHint();
  container.classList.toggle('is-hidden', !isCurrentlyShowing);

  return container;
}
