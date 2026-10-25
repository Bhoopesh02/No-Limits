import { describe, expect, it } from 'vitest';
import { createInputState, InputState } from '../data/InputState';
import { GamepadInput, GamepadLike } from './GamepadInput';
import { InputManager } from './InputManager';
import { InputProvider } from './InputProvider';

class MockProvider implements InputProvider {
  public state: InputState = createInputState();

  public poll(outState: InputState): void {
    outState.steer = this.state.steer;
    outState.throttle = this.state.throttle;
    outState.brake = this.state.brake;
    outState.handbrake = this.state.handbrake;
    outState.nitro = this.state.nitro;
    outState.pause = this.state.pause;
  }
}

describe('InputManager', () => {
  it('holds multiple providers and merges with zero allocations', () => {
    const kb = new MockProvider();
    const gp = new MockProvider();
    const touch = new MockProvider();

    const manager = new InputManager({
      keyboard: kb,
      gamepad: gp,
      touch: touch,
    });

    const s1 = manager.poll();
    const s2 = manager.poll();
    expect(s1).toBe(s2); // Reuses the exact same state object
  });

  it('correctly applies merge rules (steer = largest magnitude, throttle/brake = max, booleans = OR)', () => {
    const kb = new MockProvider();
    const gp = new MockProvider();
    const touch = new MockProvider();

    const manager = new InputManager({ keyboard: kb, gamepad: gp, touch: touch });

    // Keyboard has steer 0.3, throttle 1.0
    kb.state.steer = 0.3;
    kb.state.throttle = 1.0;

    // Gamepad has steer -0.8 (larger magnitude than 0.3), brake 0.6, handbrake true
    gp.state.steer = -0.8;
    gp.state.brake = 0.6;
    gp.state.handbrake = true;

    // Touch has nitro true, throttle 0.5
    touch.state.nitro = true;

    const state = manager.poll();

    expect(state.steer).toBe(-0.8); // Largest magnitude between 0.3 and -0.8
    expect(state.throttle).toBe(1.0); // Max between 1.0 and 0.5
    expect(state.brake).toBe(0.6); // Max brake
    expect(state.handbrake).toBe(true); // OR handbrake
    expect(state.nitro).toBe(true); // OR nitro
    expect(state.pause).toBe(false);
  });

  it('handles two providers active simultaneously with correct precedence', () => {
    const kb = new MockProvider();
    const gp = new MockProvider();
    const manager = new InputManager({ keyboard: kb, gamepad: gp });

    kb.state.steer = -1.0;
    gp.state.steer = 0.5;
    kb.state.throttle = 0.2;
    gp.state.throttle = 0.9;

    const state = manager.poll();
    expect(state.steer).toBe(-1.0);
    expect(state.throttle).toBe(0.9);
  });

  it('tracks lastUsedDevice based on the most recent non-neutral input', () => {
    const kb = new MockProvider();
    const gp = new MockProvider();
    const touch = new MockProvider();

    const manager = new InputManager({ keyboard: kb, gamepad: gp, touch: touch });
    expect(manager.lastUsedDevice).toBe('keyboard');

    // Poll neutral - stays default
    manager.poll();
    expect(manager.lastUsedDevice).toBe('keyboard');

    // Touch presses nitro
    touch.state.nitro = true;
    manager.poll();
    expect(manager.lastUsedDevice).toBe('touch');

    // Touch releases, gamepad steers
    touch.state.nitro = false;
    gp.state.steer = 0.5;
    manager.poll();
    expect(manager.lastUsedDevice).toBe('gamepad');

    // All release (neutral inputs) - retains previous last-used device
    gp.state.steer = 0;
    manager.poll();
    expect(manager.lastUsedDevice).toBe('gamepad');

    // Keyboard presses throttle
    kb.state.throttle = 1.0;
    manager.poll();
    expect(manager.lastUsedDevice).toBe('keyboard');
  });

  it('clears gamepad inputs on disconnect and does not stick input', () => {
    let connected = true;
    const pad: GamepadLike = {
      mapping: 'standard',
      connected: true,
      axes: [0.75, 0],
      buttons: Array.from({ length: 16 }, (_, i) => ({
        value: i === 7 ? 1.0 : 0,
        pressed: i === 7,
      })),
    };

    const gamepadInput = new GamepadInput(() => (connected ? [pad] : []));
    const manager = new InputManager({ gamepad: gamepadInput });

    let state = manager.poll();
    expect(state.throttle).toBe(1.0);
    expect(state.steer).toBeCloseTo(0.706, 2);

    // Unplug
    connected = false;
    gamepadInput.updateCache();
    state = manager.poll();

    expect(state.throttle).toBe(0);
    expect(state.steer).toBe(0);
    expect(state.brake).toBe(0);
    expect(state.handbrake).toBe(false);
    expect(state.nitro).toBe(false);
  });

  it('supports single-provider backward compatibility', () => {
    const kb = new MockProvider();
    kb.state.throttle = 0.75;
    const manager = new InputManager(kb);

    expect(manager.poll().throttle).toBe(0.75);
    expect(manager.getProvider()).toBe(kb);
  });
});
