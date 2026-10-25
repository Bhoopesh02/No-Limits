import { describe, expect, it, vi } from 'vitest';
import { EventBus } from './EventBus';

interface TestEvents {
  tick: number;
  message: string;
  empty: void;
}

describe('EventBus', () => {
  it('subscribes and emits events to a listener', () => {
    const bus = new EventBus<TestEvents>();
    const handler = vi.fn();

    bus.on('tick', handler);
    bus.emit('tick', 42);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(42);
  });

  it('unsubscribes via the returned unsubscribe function', () => {
    const bus = new EventBus<TestEvents>();
    const handler = vi.fn();

    const unsub = bus.on('message', handler);
    bus.emit('message', 'first');
    expect(handler).toHaveBeenCalledTimes(1);

    unsub();
    bus.emit('message', 'second');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(bus.listenerCount('message')).toBe(0);
  });

  it('unsubscribes via off() method', () => {
    const bus = new EventBus<TestEvents>();
    const handler = vi.fn();

    bus.on('tick', handler);
    bus.emit('tick', 10);
    expect(handler).toHaveBeenCalledTimes(1);

    bus.off('tick', handler);
    bus.emit('tick', 20);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(bus.listenerCount('tick')).toBe(0);
  });

  it('supports multiple listeners for the same event in registration order', () => {
    const bus = new EventBus<TestEvents>();
    const order: number[] = [];

    bus.on('tick', () => order.push(1));
    bus.on('tick', () => order.push(2));
    bus.on('tick', () => order.push(3));

    bus.emit('tick', 100);

    expect(order).toEqual([1, 2, 3]);
    expect(bus.listenerCount('tick')).toBe(3);
  });

  it('safely handles emit with no listeners', () => {
    const bus = new EventBus<TestEvents>();
    expect(() => {
      bus.emit('tick', 1);
      bus.emit('message', 'hello');
    }).not.toThrow();
  });

  it('handles listener removal during emit without skipping subsequent listeners', () => {
    const bus = new EventBus<TestEvents>();
    const calls: string[] = [];

    const unsubA = bus.on('message', (msg) => {
      calls.push(`A:${msg}`);
      unsubA();
    });

    bus.on('message', (msg) => {
      calls.push(`B:${msg}`);
    });

    bus.on('message', (msg) => {
      calls.push(`C:${msg}`);
    });

    // First emit: A removes itself, but B and C must still receive the event
    bus.emit('message', 'round1');
    expect(calls).toEqual(['A:round1', 'B:round1', 'C:round1']);

    // Second emit: only B and C should receive it
    bus.emit('message', 'round2');
    expect(calls).toEqual(['A:round1', 'B:round1', 'C:round1', 'B:round2', 'C:round2']);
    expect(bus.listenerCount('message')).toBe(2);
  });

  it('clears all listeners correctly', () => {
    const bus = new EventBus<TestEvents>();
    const handler = vi.fn();

    bus.on('tick', handler);
    bus.clear();
    bus.emit('tick', 5);

    expect(handler).not.toHaveBeenCalled();
    expect(bus.listenerCount('tick')).toBe(0);
  });
});
