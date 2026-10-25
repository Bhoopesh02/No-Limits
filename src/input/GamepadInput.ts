import { applyDeadzone } from '../core/applyDeadzone';
import { InputState, resetInputState } from '../data/InputState';
import { InputProvider } from './InputProvider';

export interface GamepadButtonLike {
  value: number;
  pressed: boolean;
}

export interface GamepadLike {
  id?: string;
  mapping?: string; // 'standard' | ''
  connected: boolean;
  axes: readonly number[];
  buttons: readonly GamepadButtonLike[];
}

export type GamepadSourceFn = () => readonly (GamepadLike | null)[];

function defaultGamepadSource(): readonly (GamepadLike | null)[] {
  if (typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function') {
    return navigator.getGamepads();
  }
  return [];
}

// Standard W3C Gamepad Button/Axis Indices
const AXIS_LEFT_STICK_X = 0;
const BUTTON_A_NITRO = 0;
const BUTTON_X_HANDBRAKE = 2;
const BUTTON_LT_BRAKE = 6;
const BUTTON_RT_THROTTLE = 7;
const BUTTON_START_PAUSE = 9;
const BUTTON_DPAD_LEFT = 14;
const BUTTON_DPAD_RIGHT = 15;

/**
 * Standard gamepad input provider.
 * Implements W3C standard gamepad mappings with analog triggers and radial deadzone.
 * Zero allocations during poll().
 */
export class GamepadInput implements InputProvider {
  private readonly source: GamepadSourceFn;
  private cachedGamepads: readonly (GamepadLike | null)[] = [];
  private isDisposed = false;

  constructor(source: GamepadSourceFn = defaultGamepadSource) {
    this.source = source;
    this.updateCache();

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('gamepadconnected', this.onGamepadEvent);
      window.addEventListener('gamepaddisconnected', this.onGamepadEvent);
    }
  }

  /**
   * navigator.getGamepads() in browser implementations allocates a fresh array
   * on every call. To prevent garbage collection pressure and avoid allocations
   * during 60 Hz fixed simulation ticks, updateCache() reads navigator.getGamepads()
   * at most once per rendered frame. poll() then queries this pre-cached snapshot
   * without allocating.
   */
  public updateCache(): void {
    if (this.isDisposed) return;
    this.cachedGamepads = this.source();
  }

  public refreshCache(): void {
    this.updateCache();
  }

  public poll(outState: InputState): void {
    const pad = this.findFirstStandardPad();

    if (!pad || !pad.connected) {
      resetInputState(outState);
      return;
    }

    // 1. Steering: Left Stick X with radial deadzone (0.15)
    const rawX = pad.axes.length > AXIS_LEFT_STICK_X ? (pad.axes[AXIS_LEFT_STICK_X] ?? 0) : 0;
    let steer = applyDeadzone(rawX, 0.15);

    // D-pad left/right also steers with priority if magnitude is larger
    const dpadLeft =
      pad.buttons.length > BUTTON_DPAD_LEFT &&
      (pad.buttons[BUTTON_DPAD_LEFT]?.pressed || (pad.buttons[BUTTON_DPAD_LEFT]?.value ?? 0) > 0.5);
    const dpadRight =
      pad.buttons.length > BUTTON_DPAD_RIGHT &&
      (pad.buttons[BUTTON_DPAD_RIGHT]?.pressed ||
        (pad.buttons[BUTTON_DPAD_RIGHT]?.value ?? 0) > 0.5);

    if (dpadLeft && !dpadRight) {
      if (Math.abs(steer) < 1.0) {
        steer = -1.0;
      }
    } else if (dpadRight && !dpadLeft) {
      if (Math.abs(steer) < 1.0) {
        steer = 1.0;
      }
    }

    outState.steer = steer;

    // 2. Throttle (Right Trigger = RT / button 7) - analog 0 to 1
    const rt =
      pad.buttons.length > BUTTON_RT_THROTTLE
        ? (pad.buttons[BUTTON_RT_THROTTLE]?.value ??
          (pad.buttons[BUTTON_RT_THROTTLE]?.pressed ? 1 : 0))
        : 0;
    outState.throttle = Math.min(1, Math.max(0, rt));

    // 3. Brake (Left Trigger = LT / button 6) - analog 0 to 1
    const lt =
      pad.buttons.length > BUTTON_LT_BRAKE
        ? (pad.buttons[BUTTON_LT_BRAKE]?.value ?? (pad.buttons[BUTTON_LT_BRAKE]?.pressed ? 1 : 0))
        : 0;
    outState.brake = Math.min(1, Math.max(0, lt));

    // 4. Face buttons: A = Nitro (button 0), X = Handbrake (button 2)
    outState.nitro =
      pad.buttons.length > BUTTON_A_NITRO ? Boolean(pad.buttons[BUTTON_A_NITRO]?.pressed) : false;

    outState.handbrake =
      pad.buttons.length > BUTTON_X_HANDBRAKE
        ? Boolean(pad.buttons[BUTTON_X_HANDBRAKE]?.pressed)
        : false;

    // 5. Start = Pause (button 9)
    outState.pause =
      pad.buttons.length > BUTTON_START_PAUSE
        ? Boolean(pad.buttons[BUTTON_START_PAUSE]?.pressed)
        : false;
  }

  public dispose(): void {
    this.isDisposed = true;
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('gamepadconnected', this.onGamepadEvent);
      window.removeEventListener('gamepaddisconnected', this.onGamepadEvent);
    }
    this.cachedGamepads = [];
  }

  private readonly onGamepadEvent = (): void => {
    this.updateCache();
  };

  private findFirstStandardPad(): GamepadLike | null {
    const pads = this.cachedGamepads;
    for (let i = 0; i < pads.length; i++) {
      const pad = pads[i];
      if (pad && pad.connected && pad.mapping === 'standard') {
        return pad;
      }
    }
    return null;
  }
}
