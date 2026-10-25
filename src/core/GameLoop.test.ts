import { describe, expect, it, vi } from 'vitest';
import { FrameScheduler, GameLoop } from './GameLoop';

describe('GameLoop', () => {
  it('starts and stops correctly', () => {
    let scheduledCallback: ((time: number) => void) | null = null;
    let nextHandle = 1;
    const cancelledHandles: number[] = [];

    const mockScheduler: FrameScheduler = {
      request(cb) {
        scheduledCallback = cb;
        return nextHandle++;
      },
      cancel(handle) {
        cancelledHandles.push(handle);
        scheduledCallback = null;
      },
    };

    const loop = new GameLoop({
      update: vi.fn(),
      render: vi.fn(),
      timeSource: () => 1000,
      scheduler: mockScheduler,
    });

    expect(loop.isRunning()).toBe(false);

    loop.start();
    expect(loop.isRunning()).toBe(true);
    expect(scheduledCallback).not.toBeNull();

    loop.stop();
    expect(loop.isRunning()).toBe(false);
    expect(cancelledHandles).toContain(1);
  });

  it('executes correct step count for given elapsed times', () => {
    const updates: number[] = [];
    const loop = new GameLoop({
      update: (dt) => updates.push(dt),
      render: vi.fn(),
      fixedDt: 1 / 60, // ~16.6667 ms
      timeSource: () => 0,
    });

    loop.start();

    // Advance 50 ms (~3 steps of 16.6667 ms = 50.0001 ms)
    // 50 ms / 16.666667 ms = 3 steps (50 ms > 49.9999 ms)
    loop.tick(50.0);

    expect(updates.length).toBe(3);
    for (const dt of updates) {
      expect(dt).toBeCloseTo(1 / 60, 5);
    }
  });

  it('computes interpolation alpha in [0, 1)', () => {
    const alphas: number[] = [];
    const fixedDt = 0.02; // 20 ms fixed step

    const loop = new GameLoop({
      update: vi.fn(),
      render: (alpha) => alphas.push(alpha),
      fixedDt,
      timeSource: () => 0,
    });

    loop.start();

    // Advance 30 ms (1 step of 20 ms, 10 ms remaining => alpha = 10 / 20 = 0.5)
    loop.tick(30);

    expect(alphas.length).toBe(1);
    expect(alphas[0]).toBeCloseTo(0.5, 4);
    expect(alphas[0]).toBeGreaterThanOrEqual(0);
    expect(alphas[0]).toBeLessThan(1);
  });

  it('clamps large delta time and caps max steps per frame', () => {
    let updateCount = 0;
    const maxSteps = 5;
    const loop = new GameLoop({
      update: () => {
        updateCount++;
      },
      render: vi.fn(),
      fixedDt: 1 / 60, // ~16.67 ms
      maxFrameDelta: 0.1, // 100 ms max
      maxStepsPerFrame: maxSteps,
      timeSource: () => 0,
    });

    loop.start();

    // Advance by a massive 2000 ms (lag spike or tab inactive)
    loop.tick(2000);

    // Delta is clamped to 100 ms (0.1s), which is ~6 steps, but maxStepsPerFrame is 5
    expect(updateCount).toBe(maxSteps);
    expect(loop.getAccumulator()).toBe(0); // Spiral-of-death guard clears excess debt
  });

  it('handles negative or zero time deltas gracefully', () => {
    let updateCalls = 0;
    let renderCalls = 0;

    const loop = new GameLoop({
      update: () => updateCalls++,
      render: () => renderCalls++,
      timeSource: () => 100,
    });

    loop.start();

    // Regressive timestamp (e.g. clock adjustment)
    loop.tick(50);

    expect(updateCalls).toBe(0);
    expect(renderCalls).toBe(1);
  });
});
