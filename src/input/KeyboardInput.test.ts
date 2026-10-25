import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInputState } from '../data/InputState';
import {
  KeyboardEventLike,
  KeyboardInput,
  KeyEventListener,
  KeyInputTarget,
} from './KeyboardInput';

class MockEventTarget implements KeyInputTarget {
  private readonly listeners = new Map<string, Set<KeyEventListener>>();

  public addEventListener(type: string, listener: KeyEventListener): void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(listener);
  }

  public removeEventListener(type: string, listener: KeyEventListener): void {
    const set = this.listeners.get(type);
    if (set) {
      set.delete(listener);
    }
  }

  public dispatch(type: string, event: Partial<KeyboardEventLike> = {}): void {
    const set = this.listeners.get(type);
    if (set) {
      const fullEvent: KeyboardEventLike = {
        code: event.code ?? '',
        key: event.key,
        preventDefault: event.preventDefault ?? vi.fn(),
      };
      for (const listener of Array.from(set)) {
        listener(fullEvent);
      }
    }
  }
}

describe('KeyboardInput', () => {
  let target: MockEventTarget;
  let keyboard: KeyboardInput;
  let state = createInputState();

  beforeEach(() => {
    target = new MockEventTarget();
    keyboard = new KeyboardInput(target);
    state = createInputState();
  });

  it('maps arrow keys and WASD to correct values', () => {
    // Throttle via ArrowUp
    target.dispatch('keydown', { code: 'ArrowUp' });
    keyboard.poll(state);
    expect(state.throttle).toBe(1);
    expect(state.brake).toBe(0);
    target.dispatch('keyup', { code: 'ArrowUp' });

    // Throttle via KeyW
    target.dispatch('keydown', { code: 'KeyW' });
    keyboard.poll(state);
    expect(state.throttle).toBe(1);
    target.dispatch('keyup', { code: 'KeyW' });

    // Brake via ArrowDown
    target.dispatch('keydown', { code: 'ArrowDown' });
    keyboard.poll(state);
    expect(state.throttle).toBe(0);
    expect(state.brake).toBe(1);
    target.dispatch('keyup', { code: 'ArrowDown' });

    // Brake via KeyS
    target.dispatch('keydown', { code: 'KeyS' });
    keyboard.poll(state);
    expect(state.brake).toBe(1);
    target.dispatch('keyup', { code: 'KeyS' });

    // Steer left via ArrowLeft
    target.dispatch('keydown', { code: 'ArrowLeft' });
    keyboard.poll(state);
    expect(state.steer).toBe(-1);
    target.dispatch('keyup', { code: 'ArrowLeft' });

    // Steer left via KeyA
    target.dispatch('keydown', { code: 'KeyA' });
    keyboard.poll(state);
    expect(state.steer).toBe(-1);
    target.dispatch('keyup', { code: 'KeyA' });

    // Steer right via ArrowRight
    target.dispatch('keydown', { code: 'ArrowRight' });
    keyboard.poll(state);
    expect(state.steer).toBe(1);
    target.dispatch('keyup', { code: 'ArrowRight' });

    // Steer right via KeyD
    target.dispatch('keydown', { code: 'KeyD' });
    keyboard.poll(state);
    expect(state.steer).toBe(1);
    target.dispatch('keyup', { code: 'KeyD' });

    // Handbrake via Space
    target.dispatch('keydown', { code: 'Space' });
    keyboard.poll(state);
    expect(state.handbrake).toBe(true);
    target.dispatch('keyup', { code: 'Space' });

    // Nitro via ShiftLeft and ShiftRight
    target.dispatch('keydown', { code: 'ShiftLeft' });
    keyboard.poll(state);
    expect(state.nitro).toBe(true);
    target.dispatch('keyup', { code: 'ShiftLeft' });

    target.dispatch('keydown', { code: 'ShiftRight' });
    keyboard.poll(state);
    expect(state.nitro).toBe(true);
    target.dispatch('keyup', { code: 'ShiftRight' });

    // Pause via Escape
    target.dispatch('keydown', { code: 'Escape' });
    keyboard.poll(state);
    expect(state.pause).toBe(true);
    target.dispatch('keyup', { code: 'Escape' });
  });

  it('cancels opposite keys on steering and throttle/brake', () => {
    // Steer left + right cancels to 0
    target.dispatch('keydown', { code: 'ArrowLeft' });
    target.dispatch('keydown', { code: 'ArrowRight' });
    keyboard.poll(state);
    expect(state.steer).toBe(0);

    // WASD left + right cancels to 0
    target.dispatch('keyup', { code: 'ArrowLeft' });
    target.dispatch('keyup', { code: 'ArrowRight' });
    target.dispatch('keydown', { code: 'KeyA' });
    target.dispatch('keydown', { code: 'KeyD' });
    keyboard.poll(state);
    expect(state.steer).toBe(0);

    // Throttle + brake cancels both to 0
    target.dispatch('keydown', { code: 'KeyW' });
    target.dispatch('keydown', { code: 'KeyS' });
    keyboard.poll(state);
    expect(state.throttle).toBe(0);
    expect(state.brake).toBe(0);
  });

  it('clears all keys on window blur so throttle never sticks', () => {
    target.dispatch('keydown', { code: 'KeyW' });
    target.dispatch('keydown', { code: 'KeyD' });
    target.dispatch('keydown', { code: 'Space' });
    keyboard.poll(state);
    expect(state.throttle).toBe(1);
    expect(state.steer).toBe(1);
    expect(state.handbrake).toBe(true);

    // Trigger window blur
    target.dispatch('blur');
    keyboard.poll(state);
    expect(state.throttle).toBe(0);
    expect(state.steer).toBe(0);
    expect(state.handbrake).toBe(false);
  });

  it('releases keys on keyup with no stuck keys', () => {
    target.dispatch('keydown', { code: 'ArrowUp' });
    keyboard.poll(state);
    expect(state.throttle).toBe(1);

    target.dispatch('keyup', { code: 'ArrowUp' });
    keyboard.poll(state);
    expect(state.throttle).toBe(0);
  });

  it('calls preventDefault for scroll-causing game keys', () => {
    const preventDefault = vi.fn();
    target.dispatch('keydown', { code: 'ArrowDown', preventDefault });
    expect(preventDefault).toHaveBeenCalled();

    const nonGamePreventDefault = vi.fn();
    target.dispatch('keydown', { code: 'KeyM', preventDefault: nonGamePreventDefault });
    expect(nonGamePreventDefault).not.toHaveBeenCalled();
  });
});
