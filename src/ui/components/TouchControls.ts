import { TouchControlState } from '../../data/TouchControlState';

export interface TouchControlsElement extends HTMLElement {
  setVisible(visible: boolean): void;
  isVisible(): boolean;
  dispose(): void;
}

export function isPointInBounds(
  x: number,
  y: number,
  bounds: { left: number; right: number; top: number; bottom: number },
): boolean {
  return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
}

export function shouldShowTouchControlsGiven(search: string, isCoarsePointer: boolean): boolean {
  try {
    const params = new URLSearchParams(search);
    if (params.get('touch') === '1') {
      return true;
    }
  } catch {
    // Ignore URL parse errors
  }
  return isCoarsePointer;
}

export function shouldShowTouchControls(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    return shouldShowTouchControlsGiven(window.location.search, isCoarse);
  } catch {
    return false;
  }
}

interface TouchButtonConfig {
  className: string;
  ariaLabel: string;
  iconSvg: string;
  labelText: string;
  onPress: () => void;
  onRelease: () => void;
}

function createTouchButton(config: TouchButtonConfig): {
  btn: HTMLButtonElement;
  cleanup: () => void;
} {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `nl-touch-btn ${config.className}`;
  btn.setAttribute('aria-label', config.ariaLabel);

  btn.innerHTML = `
    <span class="nl-touch-btn__icon" aria-hidden="true">${config.iconSvg}</span>
    <span class="nl-touch-btn__label" aria-hidden="true">${config.labelText}</span>
  `;

  let activePointerId: number | null = null;

  const release = () => {
    if (activePointerId !== null) {
      const pid = activePointerId;
      activePointerId = null;
      try {
        if (btn.hasPointerCapture(pid)) {
          btn.releasePointerCapture(pid);
        }
      } catch {
        // Ignored
      }
      btn.classList.remove('is-pressed');
      config.onRelease();
    }
  };

  const handlePointerDown = (e: PointerEvent) => {
    e.preventDefault();
    if (activePointerId !== null) return;
    activePointerId = e.pointerId;
    try {
      btn.setPointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
    btn.classList.add('is-pressed');
    config.onPress();
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (e.pointerId === activePointerId) {
      release();
    }
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (e.pointerId === activePointerId) {
      // Release button immediately if the player slides their finger outside bounds
      const rect = btn.getBoundingClientRect();
      const isInside = isPointInBounds(e.clientX, e.clientY, rect);
      if (!isInside) {
        release();
      }
    }
  };

  const handleCancel = (e: PointerEvent) => {
    if (e.pointerId === activePointerId) {
      release();
    }
  };

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  btn.addEventListener('pointerdown', handlePointerDown);
  btn.addEventListener('pointerup', handlePointerUp);
  btn.addEventListener('pointermove', handlePointerMove);
  btn.addEventListener('pointercancel', handleCancel);
  btn.addEventListener('lostpointercapture', handleCancel);
  btn.addEventListener('contextmenu', handleContextMenu);

  const cleanup = () => {
    release();
    btn.removeEventListener('pointerdown', handlePointerDown);
    btn.removeEventListener('pointerup', handlePointerUp);
    btn.removeEventListener('pointermove', handlePointerMove);
    btn.removeEventListener('pointercancel', handleCancel);
    btn.removeEventListener('lostpointercapture', handleCancel);
    btn.removeEventListener('contextmenu', handleContextMenu);
  };

  return { btn, cleanup };
}

export function createTouchControls(state: TouchControlState): TouchControlsElement {
  const container = document.createElement('div') as unknown as TouchControlsElement;
  container.className = 'nl-touch-controls';

  const cleanups: (() => void)[] = [];

  // 1. Left Cluster: Steering (Left / Right)
  const leftCluster = document.createElement('div');
  leftCluster.className = 'nl-touch-cluster--left';

  const steerLeft = createTouchButton({
    className: 'nl-touch-btn--steer',
    ariaLabel: 'Steer Left',
    iconSvg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 19l-7-7 7-7"/></svg>`,
    labelText: 'LEFT',
    onPress: () => {
      state.steerLeft = true;
    },
    onRelease: () => {
      state.steerLeft = false;
    },
  });
  cleanups.push(steerLeft.cleanup);
  leftCluster.appendChild(steerLeft.btn);

  const steerRight = createTouchButton({
    className: 'nl-touch-btn--steer',
    ariaLabel: 'Steer Right',
    iconSvg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>`,
    labelText: 'RIGHT',
    onPress: () => {
      state.steerRight = true;
    },
    onRelease: () => {
      state.steerRight = false;
    },
  });
  cleanups.push(steerRight.cleanup);
  leftCluster.appendChild(steerRight.btn);

  container.appendChild(leftCluster);

  // 2. Right Cluster: Nitro & Handbrake, Brake & Throttle
  const rightCluster = document.createElement('div');
  rightCluster.className = 'nl-touch-cluster--right';

  const auxGroup = document.createElement('div');
  auxGroup.className = 'nl-touch-group--aux';

  const nitroBtn = createTouchButton({
    className: 'nl-touch-btn--nitro',
    ariaLabel: 'Nitro Boost',
    iconSvg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
    labelText: 'NITRO',
    onPress: () => {
      state.nitro = true;
    },
    onRelease: () => {
      state.nitro = false;
    },
  });
  cleanups.push(nitroBtn.cleanup);
  auxGroup.appendChild(nitroBtn.btn);

  const handbrakeBtn = createTouchButton({
    className: 'nl-touch-btn--handbrake',
    ariaLabel: 'Handbrake Drift',
    iconSvg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`,
    labelText: 'DRIFT',
    onPress: () => {
      state.handbrake = true;
    },
    onRelease: () => {
      state.handbrake = false;
    },
  });
  cleanups.push(handbrakeBtn.cleanup);
  auxGroup.appendChild(handbrakeBtn.btn);

  rightCluster.appendChild(auxGroup);

  const pedalGroup = document.createElement('div');
  pedalGroup.className = 'nl-touch-group--pedals';

  const brakeBtn = createTouchButton({
    className: 'nl-touch-btn--brake',
    ariaLabel: 'Brake or Reverse',
    iconSvg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14m-6-6l6 6 6-6"/></svg>`,
    labelText: 'BRAKE',
    onPress: () => {
      state.brake = true;
    },
    onRelease: () => {
      state.brake = false;
    },
  });
  cleanups.push(brakeBtn.cleanup);
  pedalGroup.appendChild(brakeBtn.btn);

  const throttleBtn = createTouchButton({
    className: 'nl-touch-btn--throttle',
    ariaLabel: 'Throttle Acceleration',
    iconSvg: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5m-6 6l6-6 6 6"/></svg>`,
    labelText: 'GAS',
    onPress: () => {
      state.throttle = true;
    },
    onRelease: () => {
      state.throttle = false;
    },
  });
  cleanups.push(throttleBtn.cleanup);
  pedalGroup.appendChild(throttleBtn.btn);

  rightCluster.appendChild(pedalGroup);

  container.appendChild(rightCluster);

  container.setVisible = (visible: boolean) => {
    container.classList.toggle('is-hidden', !visible);
  };

  container.isVisible = () => !container.classList.contains('is-hidden');

  container.dispose = () => {
    for (let i = 0; i < cleanups.length; i++) {
      cleanups[i]();
    }
    cleanups.length = 0;
    if (container.parentElement) {
      container.parentElement.removeChild(container);
    }
  };

  // Initial visibility check
  container.setVisible(shouldShowTouchControls());

  return container;
}
