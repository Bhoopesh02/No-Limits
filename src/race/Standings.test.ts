import { describe, expect, it } from 'vitest';
import { Standings } from './Standings';

describe('Standings', () => {
  const trackLength = 1000;

  it('ranks cars by total progress before any car finishes', () => {
    const standings = new Standings(trackLength, 6);
    standings.reset([10, 20, 30, 40, 50, 60]);

    // Car 5 has 60m (1st), car 4 has 50m (2nd), ..., car 0 has 10m (6th)
    expect(standings.positionOf(5)).toBe(1);
    expect(standings.positionOf(4)).toBe(2);
    expect(standings.positionOf(3)).toBe(3);
    expect(standings.positionOf(2)).toBe(4);
    expect(standings.positionOf(1)).toBe(5);
    expect(standings.positionOf(0)).toBe(6);

    expect(standings.getOrderedCarIndices()).toEqual([5, 4, 3, 2, 1, 0]);
  });

  it('handles seamless crossing of the finish line without any progress drops', () => {
    const standings = new Standings(trackLength, 6);
    standings.reset([990, 980, 500, 400, 300, 200]);

    expect(standings.positionOf(0)).toBe(1); // 990m
    expect(standings.positionOf(1)).toBe(2); // 980m

    // Car 0 crosses the finish line (from 990m to 15m) -> +25m step
    standings.updateProgress(0, 15);
    standings.sort();

    expect(standings.getProgress(0)).toBeCloseTo(1015, 3);
    expect(standings.positionOf(0)).toBe(1);

    // Car 1 crosses (from 980m to 5m) -> +25m step
    standings.updateProgress(1, 5);
    standings.sort();

    expect(standings.getProgress(1)).toBeCloseTo(1005, 3);
    expect(standings.positionOf(1)).toBe(2);
  });

  it('ranks finished cars first by finish step over unfinished cars with higher progress', () => {
    const standings = new Standings(trackLength, 6);
    standings.reset([2000, 2000, 2000, 2000, 2000, 2000]);

    // Car 2 finishes at step 1000 (1st place)
    standings.recordFinish(2, 1000);
    // Car 0 finishes at step 1020 (2nd place)
    standings.recordFinish(0, 1020);

    // Car 4 has not finished yet, but has accumulated more meters due to wide driving
    standings.updateProgress(4, 2500);

    standings.sort();

    expect(standings.positionOf(2)).toBe(1); // 1st finished
    expect(standings.positionOf(0)).toBe(2); // 2nd finished
    expect(standings.positionOf(4)).toBe(3); // running leader
  });

  it('breaks ties deterministically by car index', () => {
    const standings = new Standings(trackLength, 6);
    standings.reset([100, 100, 100, 100, 100, 100]);

    // All progress identical -> tied by car index: 0, 1, 2, 3, 4, 5
    expect(standings.getOrderedCarIndices()).toEqual([0, 1, 2, 3, 4, 5]);
    expect(standings.positionOf(0)).toBe(1);
    expect(standings.positionOf(5)).toBe(6);
  });
});
