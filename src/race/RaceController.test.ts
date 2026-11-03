import { describe, expect, it } from 'vitest';
import { EventBus } from '../core/EventBus';
import type { GameEvents } from '../data/GameEvents';
import { createInputState } from '../data/InputState';
import { RaceController } from './RaceController';

describe('RaceController', () => {
  const trackLength = 1000;
  const totalLaps = 3;
  const checkpointCount = 4;
  const fixedDt = 1 / 60;
  const stepsPerTick = 60;

  it('enforces countdown timing and input lock', () => {
    const bus = new EventBus<GameEvents>();
    const countdownEvents: (number | 'GO')[] = [];
    bus.on('race:countdown', (p) => countdownEvents.push(p.count));

    const controller = new RaceController({
      trackLength,
      totalLaps,
      checkpointCount,
      bus,
      stepsPerCountdownTick: stepsPerTick,
    });

    const playerInput = createInputState();
    playerInput.throttle = 1.0;
    playerInput.steer = 0.5;

    // During countdown step 0: tick 3, input locked to neutral
    controller.update(0, fixedDt);
    expect(controller.getPhase()).toBe('Countdown');
    expect(controller.getCountdownDisplay()).toBe(3);
    const filtered1 = controller.filterInput(playerInput);
    expect(filtered1.throttle).toBe(0);
    expect(filtered1.steer).toBe(0);

    // Advance 60 steps -> tick 2
    for (let s = 1; s < 60; s++) {
      controller.update(0, fixedDt);
    }
    controller.update(0, fixedDt);
    expect(controller.getCountdownDisplay()).toBe(2);

    // Advance to step 120 -> tick 1
    for (let s = 61; s < 120; s++) {
      controller.update(0, fixedDt);
    }
    controller.update(0, fixedDt);
    expect(controller.getCountdownDisplay()).toBe(1);

    // Advance to step 180 -> GO!
    for (let s = 121; s < 180; s++) {
      controller.update(0, fixedDt);
    }
    expect(controller.getPhase()).toBe('Running');
    expect(controller.getCountdownDisplay()).toBe('GO');

    // In running phase, input is no longer locked
    const filteredRunning = controller.filterInput(playerInput);
    expect(filteredRunning.throttle).toBe(1.0);
    expect(filteredRunning.steer).toBe(0.5);

    expect(countdownEvents).toEqual([3, 2, 1, 'GO']);
  });

  it('reaches total laps and finishes exactly once with sum of lap times matching total time', () => {
    const bus = new EventBus<GameEvents>();
    let finishedCount = 0;
    bus.on('race:finished', () => {
      finishedCount++;
    });

    const controller = new RaceController({
      trackLength,
      totalLaps,
      checkpointCount,
      bus,
      stepsPerCountdownTick: 10, // Short countdown for fast test
    });

    // Complete countdown (30 steps)
    for (let s = 0; s < 30; s++) {
      controller.update(0, fixedDt);
    }
    expect(controller.getPhase()).toBe('Running');

    // Simulate 3 full laps driven forward
    // Speed = 20 m/s -> 1000m takes 50s (3000 steps per lap)
    const speed = 20;
    const stepDist = speed * fixedDt;
    let dist = 0;

    // Drive 3 laps
    for (let lap = 0; lap < 3; lap++) {
      for (let s = 0; s < 3000; s++) {
        dist = (dist + stepDist) % trackLength;
        controller.update(dist, fixedDt);
        if (controller.getPhase() === 'Finished') break;
      }
    }

    expect(controller.getPhase()).toBe('Finished');
    expect(finishedCount).toBe(1);

    const result = controller.getResult();
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.lapsCompleted).toBe(3);
    expect(result.lapTimesMs.length).toBe(3);
    expect(result.position).toBe(1);

    // Total time equals the sum of lap times within one step
    const sumLapTimes = result.lapTimesMs.reduce((a, b) => a + b, 0);
    expect(Math.abs(result.totalTimeMs - sumLapTimes)).toBeLessThanOrEqual(fixedDt * 1000);

    // Verify input locked in Finished phase (car coasts)
    const input = createInputState();
    input.throttle = 1.0;
    const filteredCoast = controller.filterInput(input);
    expect(filteredCoast.throttle).toBe(0);

    // Check no NaN in any field
    expect(Number.isNaN(result.totalTimeMs)).toBe(false);
    expect(Number.isNaN(result.bestLapTimeMs)).toBe(false);
    for (const lapTime of result.lapTimesMs) {
      expect(Number.isNaN(lapTime)).toBe(false);
    }
  });

  it('guarantees determinism over thousands of steps', () => {
    const runSimulation = () => {
      const controller = new RaceController({
        trackLength,
        totalLaps: 2,
        checkpointCount: 4,
        stepsPerCountdownTick: 10,
      });

      // Countdown
      for (let s = 0; s < 30; s++) {
        controller.update(0, fixedDt);
      }

      // Drive 2 laps with fixed step distance (speed = 40 m/s -> 2400 steps for 2 laps)
      let dist = 0;
      const stepDist = 40 * fixedDt;
      for (let s = 0; s < 5000; s++) {
        dist = (dist + stepDist) % trackLength;
        controller.update(dist, fixedDt);
        if (controller.getPhase() === 'Finished') break;
      }

      return controller.getResult();
    };

    const run1 = runSimulation();
    const run2 = runSimulation();

    expect(run1).toEqual(run2);
    expect(run1?.totalTimeMs).toBeDefined();
    expect(Number.isNaN(run1?.totalTimeMs ?? NaN)).toBe(false);
  });
});
