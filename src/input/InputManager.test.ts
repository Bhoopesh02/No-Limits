import { describe, expect, it } from 'vitest';
import { InputManager } from './InputManager';
import { InputProvider } from './InputProvider';
import { InputState } from '../data/InputState';

class DummyProvider implements InputProvider {
  public throttleValue = 0;
  public poll(outState: InputState): void {
    outState.throttle = this.throttleValue;
    outState.steer = 0.5;
  }
}

describe('InputManager', () => {
  it('holds provider and returns polled input state with zero allocations', () => {
    const dummy = new DummyProvider();
    dummy.throttleValue = 0.75;
    const manager = new InputManager(dummy);

    const s1 = manager.poll();
    expect(s1.throttle).toBe(0.75);
    expect(s1.steer).toBe(0.5);

    dummy.throttleValue = 1.0;
    const s2 = manager.poll();
    expect(s2.throttle).toBe(1.0);
    expect(s1).toBe(s2); // Reuses the exact same state object!
  });

  it('allows swapping the input provider', () => {
    const dummy1 = new DummyProvider();
    dummy1.throttleValue = 0.2;
    const dummy2 = new DummyProvider();
    dummy2.throttleValue = 0.9;

    const manager = new InputManager(dummy1);
    expect(manager.poll().throttle).toBe(0.2);

    manager.setProvider(dummy2);
    expect(manager.getProvider()).toBe(dummy2);
    expect(manager.poll().throttle).toBe(0.9);
  });
});
