import { InputProvider } from './InputProvider';
import { InputState } from '../data/InputState';

export interface KeyboardEventLike {
  readonly code: string;
  readonly key?: string;
  preventDefault?(): void;
}

export type KeyEventListener = (event: KeyboardEventLike) => void;

export interface KeyInputTarget {
  addEventListener(type: string, listener: KeyEventListener): void;
  removeEventListener(type: string, listener: KeyEventListener): void;
}

const PREVENT_DEFAULT_CODES = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);

export class KeyboardInput implements InputProvider {
  private readonly target: KeyInputTarget;
  private readonly pressedCodes = new Set<string>();

  constructor(target?: KeyInputTarget) {
    if (target) {
      this.target = target;
    } else if (typeof window !== 'undefined') {
      this.target = window as unknown as KeyInputTarget;
    } else {
      // In headless environments with no target provided, use no-op fallback
      this.target = {
        addEventListener: () => {},
        removeEventListener: () => {},
      };
    }

    this.target.addEventListener('keydown', this.onKeyDown);
    this.target.addEventListener('keyup', this.onKeyUp);
    this.target.addEventListener('blur', this.onBlur);
  }

  public poll(outState: InputState): void {
    const up = this.pressedCodes.has('ArrowUp') || this.pressedCodes.has('KeyW');
    const down = this.pressedCodes.has('ArrowDown') || this.pressedCodes.has('KeyS');
    const left = this.pressedCodes.has('ArrowLeft') || this.pressedCodes.has('KeyA');
    const right = this.pressedCodes.has('ArrowRight') || this.pressedCodes.has('KeyD');

    // Opposite keys cancel
    if (up && down) {
      outState.throttle = 0;
      outState.brake = 0;
    } else {
      outState.throttle = up ? 1 : 0;
      outState.brake = down ? 1 : 0;
    }

    if (left && right) {
      outState.steer = 0;
    } else if (left) {
      outState.steer = -1;
    } else if (right) {
      outState.steer = 1;
    } else {
      outState.steer = 0;
    }

    outState.handbrake = this.pressedCodes.has('Space');
    outState.nitro = this.pressedCodes.has('ShiftLeft') || this.pressedCodes.has('ShiftRight');
    outState.pause = this.pressedCodes.has('Escape');
  }

  public dispose(): void {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.target.removeEventListener('blur', this.onBlur);
    this.pressedCodes.clear();
  }

  private readonly onKeyDown = (event: KeyboardEventLike): void => {
    if (event.code) {
      this.pressedCodes.add(event.code);
      if (PREVENT_DEFAULT_CODES.has(event.code) && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
    }
  };

  private readonly onKeyUp = (event: KeyboardEventLike): void => {
    if (event.code) {
      this.pressedCodes.delete(event.code);
    }
  };

  private readonly onBlur = (): void => {
    // Clear all keys on blur so controls never stick
    this.pressedCodes.clear();
  };
}
