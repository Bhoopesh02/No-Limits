import { describe, expect, it } from 'vitest';
import { Checkpoints } from './Checkpoints';

describe('Checkpoints', () => {
  const trackLength = 1000;
  const checkpointCount = 4; // Checkpoints at 0, 250, 500, 750

  it('counts checkpoints in order', () => {
    const cp = new Checkpoints(trackLength, checkpointCount);
    cp.reset(0);

    // Initial state: waiting for checkpoint 1 (at 250)
    expect(cp.getState().nextExpectedCheckpoint).toBe(1);
    expect(cp.getState().checkpointsPassedThisLap).toBe(0);

    // Drive to checkpoint 1 (at 250)
    let res = cp.update(240);
    expect(res.checkpointPassed).toBeNull();

    res = cp.update(260);
    expect(res.checkpointPassed).toBe(1);
    expect(cp.getState().nextExpectedCheckpoint).toBe(2);
    expect(cp.getState().checkpointsPassedThisLap).toBe(1);

    // Drive to checkpoint 2 (at 500)
    res = cp.update(510);
    expect(res.checkpointPassed).toBe(2);
    expect(cp.getState().nextExpectedCheckpoint).toBe(3);
    expect(cp.getState().checkpointsPassedThisLap).toBe(2);

    // Drive to checkpoint 3 (at 750)
    res = cp.update(760);
    expect(res.checkpointPassed).toBe(3);
    expect(cp.getState().nextExpectedCheckpoint).toBe(0);
    expect(cp.getState().checkpointsPassedThisLap).toBe(3);

    // Drive across finish line (wrap forward: 990 -> 10)
    cp.update(990);
    res = cp.update(10);
    expect(res.checkpointPassed).toBe(0);
    expect(res.lapCompleted).toBe(true);
    expect(cp.getState().nextExpectedCheckpoint).toBe(1);
    expect(cp.getState().checkpointsPassedThisLap).toBe(0);
  });

  it('skipping a checkpoint means the lap does NOT count and requires going back around', () => {
    const cp = new Checkpoints(trackLength, checkpointCount);
    cp.reset(0);

    // Pass checkpoint 1 (250)
    cp.update(260);
    expect(cp.getState().nextExpectedCheckpoint).toBe(2);

    // Skip checkpoint 2 (500), go straight to checkpoint 3 (750)
    cp.update(760);
    // Since cp 2 was skipped, cp 3 is not expected, so it does NOT register
    expect(cp.getState().nextExpectedCheckpoint).toBe(2);
    expect(cp.getState().checkpointsPassedThisLap).toBe(1);

    // Cross finish line
    cp.update(990);
    const res = cp.update(10);
    expect(res.lapCompleted).toBe(false);
    // Crossing finish line without all checkpoints resets progress to try again
    expect(cp.getState().nextExpectedCheckpoint).toBe(1);
    expect(cp.getState().checkpointsPassedThisLap).toBe(0);
  });

  it('cutting back across the finish line backwards does nothing', () => {
    const cp = new Checkpoints(trackLength, checkpointCount);
    cp.reset(10);

    // Reverse across start/finish: 10 -> 990
    const res = cp.update(990);
    expect(res.checkpointPassed).toBeNull();
    expect(res.lapCompleted).toBe(false);
    expect(cp.getState().nextExpectedCheckpoint).toBe(1);
  });

  it('jitter near a gate counts once only', () => {
    const cp = new Checkpoints(trackLength, checkpointCount);
    cp.reset(0);

    // Approach and cross checkpoint 1 (250)
    cp.update(240);
    const res1 = cp.update(260);
    expect(res1.checkpointPassed).toBe(1);

    // Jitter around 250: 245 -> 255 -> 240 -> 260
    const res2 = cp.update(245);
    expect(res2.checkpointPassed).toBeNull();
    const res3 = cp.update(255);
    expect(res3.checkpointPassed).toBeNull();
    const res4 = cp.update(240);
    expect(res4.checkpointPassed).toBeNull();
    const res5 = cp.update(260);
    expect(res5.checkpointPassed).toBeNull();

    // Checkpoint 1 was only counted once, expecting 2
    expect(cp.getState().nextExpectedCheckpoint).toBe(2);
    expect(cp.getState().checkpointsPassedThisLap).toBe(1);
  });
});
