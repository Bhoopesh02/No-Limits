import { describe, expect, it } from 'vitest';
import { createInputState } from '../data/InputState';
import { GamepadButtonLike, GamepadInput, GamepadLike } from './GamepadInput';

interface MutableGamepad {
  id?: string;
  mapping?: string;
  connected: boolean;
  axes: number[];
  buttons: GamepadButtonLike[];
}

function createMockGamepad(overrides: Partial<MutableGamepad> = {}): MutableGamepad {
  const defaultButtons: GamepadButtonLike[] = Array.from({ length: 16 }, () => ({
    value: 0,
    pressed: false,
  }));

  return {
    id: 'Standard Controller',
    mapping: 'standard',
    connected: true,
    axes: [0, 0, 0, 0],
    buttons: defaultButtons,
    ...overrides,
  };
}

describe('GamepadInput', () => {
  it('correctly maps standard gamepad buttons and analog triggers', () => {
    let mockPads: readonly (GamepadLike | null)[] = [];
    const pad = createMockGamepad();

    // Trigger values
    pad.buttons[7] = { value: 0.85, pressed: true }; // RT = throttle
    pad.buttons[6] = { value: 0.4, pressed: true }; // LT = brake
    pad.buttons[0] = { value: 1.0, pressed: true }; // A = nitro
    pad.buttons[2] = { value: 1.0, pressed: true }; // X = handbrake
    pad.buttons[9] = { value: 1.0, pressed: true }; // Start = pause
    pad.axes = [0.8, 0, 0, 0]; // Left stick X

    mockPads = [pad];
    const gamepadInput = new GamepadInput(() => mockPads);
    const outState = createInputState();

    gamepadInput.poll(outState);

    expect(outState.throttle).toBeCloseTo(0.85, 2);
    expect(outState.brake).toBeCloseTo(0.4, 2);
    expect(outState.nitro).toBe(true);
    expect(outState.handbrake).toBe(true);
    expect(outState.pause).toBe(true);
    // 0.8 with 0.15 deadzone -> (0.8 - 0.15) / 0.85 = 0.65 / 0.85 = ~0.7647
    expect(outState.steer).toBeCloseTo(0.765, 2);
  });

  it('applies deadzone to left stick X', () => {
    const pad = createMockGamepad();
    pad.axes = [0.12, 0]; // Below 0.15 deadzone
    const gamepadInput = new GamepadInput(() => [pad]);
    const outState = createInputState();

    gamepadInput.poll(outState);
    expect(outState.steer).toBe(0);
  });

  it('allows d-pad left and right to steer', () => {
    const pad = createMockGamepad();
    pad.buttons[14] = { value: 1, pressed: true }; // D-pad left
    const gamepadInput = new GamepadInput(() => [pad]);
    const outState = createInputState();

    gamepadInput.poll(outState);
    expect(outState.steer).toBe(-1.0);

    // Switch to D-pad right
    pad.buttons[14] = { value: 0, pressed: false };
    pad.buttons[15] = { value: 1, pressed: true };
    gamepadInput.poll(outState);
    expect(outState.steer).toBe(1.0);
  });

  it('selects the first connected standard-mapping gamepad and ignores non-standard', () => {
    const nonStandardPad = createMockGamepad({
      mapping: '', // Non-standard mapping
      buttons: Array.from({ length: 16 }, () => ({ value: 1, pressed: true })),
    });
    const standardPad = createMockGamepad({
      mapping: 'standard',
      buttons: Array.from({ length: 16 }, () => ({ value: 0, pressed: false })),
    });
    standardPad.buttons[0] = { value: 1, pressed: true }; // A = nitro

    const gamepadInput = new GamepadInput(() => [nonStandardPad, standardPad]);
    const outState = createInputState();

    gamepadInput.poll(outState);
    // Should have read standardPad (nitro: true), not nonStandardPad
    expect(outState.nitro).toBe(true);
  });

  it('handles disconnect and resets inputs to neutral with no stuck states', () => {
    let mockPads: readonly (GamepadLike | null)[] = [];
    const pad = createMockGamepad();
    pad.buttons[7] = { value: 1.0, pressed: true }; // Throttle 100%
    pad.axes = [1.0, 0];
    mockPads = [pad];

    const gamepadInput = new GamepadInput(() => mockPads);
    const outState = createInputState();

    gamepadInput.poll(outState);
    expect(outState.throttle).toBe(1.0);
    expect(outState.steer).toBe(1.0);

    // Unplug controller
    mockPads = [];
    gamepadInput.updateCache();
    gamepadInput.poll(outState);

    expect(outState.throttle).toBe(0);
    expect(outState.brake).toBe(0);
    expect(outState.steer).toBe(0);
    expect(outState.nitro).toBe(false);
    expect(outState.handbrake).toBe(false);
    expect(outState.pause).toBe(false);
  });

  it('reads from cache without calling source during poll', () => {
    let callCount = 0;
    const pad = createMockGamepad();
    const source = () => {
      callCount++;
      return [pad];
    };

    const gamepadInput = new GamepadInput(source);
    expect(callCount).toBe(1); // constructor calls updateCache()

    const outState = createInputState();
    gamepadInput.poll(outState);
    gamepadInput.poll(outState);
    expect(callCount).toBe(1); // poll did not re-query the source!

    gamepadInput.updateCache();
    expect(callCount).toBe(2);
  });
});
