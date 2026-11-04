import { describe, expect, it } from 'vitest';
import type { AiVehicleReadout } from '../data/AiVehicleReadout';
import { OPPONENT_ROSTER } from '../data/OpponentRoster';
import type { TrackSample, TrackSampler } from '../data/TrackSampler';
import { AiDriver } from './AiDriver';
import { RacingLine } from './RacingLine';

class MockTrackSampler implements TrackSampler {
  public readonly totalLength = 1000;
  public readonly closed = true;

  public sample(distance: number, out: TrackSample): void {
    const angle = (distance / this.totalLength) * Math.PI * 2;
    const r = this.totalLength / (Math.PI * 2);
    out.x = Math.cos(angle) * r;
    out.y = 0;
    out.z = Math.sin(angle) * r;
    out.tangentX = -Math.sin(angle);
    out.tangentZ = Math.cos(angle);
    out.normalX = Math.cos(angle);
    out.normalZ = Math.sin(angle);
    out.width = 12.0;
  }

  public wrap(distance: number): number {
    return ((distance % this.totalLength) + this.totalLength) % this.totalLength;
  }
}

describe('AiDriver', () => {
  const sampler = new MockTrackSampler();
  const racingLine = new RacingLine(sampler, 64.0);
  const driverConfig = OPPONENT_ROSTER[0]; // Apex Hunter

  it('keeps inputs strictly frozen (neutral) during Countdown and after finishing', () => {
    const ai = new AiDriver({
      driver: driverConfig,
      racingLine,
      seed: 42,
    });

    const readout: AiVehicleReadout = { x: 0, z: 0, heading: 0, speed: 0, lateralSpeed: 0 };
    const countdownInput = ai.update(readout, 0, 'Countdown', 1 / 60);

    expect(countdownInput.throttle).toBe(0);
    expect(countdownInput.brake).toBe(0);
    expect(countdownInput.steer).toBe(0);

    ai.setFinished(true);
    const finishedInput = ai.update(readout, 0, 'Running', 1 / 60);
    expect(finishedInput.throttle).toBe(0);
    expect(finishedInput.brake).toBe(0);
    expect(finishedInput.steer).toBe(0);
  });

  it('is completely deterministic: identical seeds produce identical inputs over 5000 steps', () => {
    const ai1 = new AiDriver({ driver: driverConfig, racingLine, seed: 777 });
    const ai2 = new AiDriver({ driver: driverConfig, racingLine, seed: 777 });

    const readout: AiVehicleReadout = { x: 10, z: -20, heading: 0.1, speed: 30, lateralSpeed: 0 };

    for (let step = 0; step < 5000; step++) {
      const in1 = ai1.update(readout, 100, 'Running', 1 / 60);
      const in2 = ai2.update(readout, 100, 'Running', 1 / 60);

      expect(in1.steer).toBe(in2.steer);
      expect(in1.throttle).toBe(in2.throttle);
      expect(in1.brake).toBe(in2.brake);
    }
  });

  it('guarantees normalized steering, throttle, and brake bounds with zero simultaneous full overlap', () => {
    const ai = new AiDriver({ driver: driverConfig, racingLine, seed: 101 });
    const readout: AiVehicleReadout = { x: 50, z: 50, heading: 1.2, speed: 45, lateralSpeed: 2.0 };

    for (let step = 0; step < 200; step++) {
      const input = ai.update(readout, 0, 'Running', 1 / 60);

      expect(input.steer).toBeGreaterThanOrEqual(-1.0);
      expect(input.steer).toBeLessThanOrEqual(1.0);
      expect(input.throttle).toBeGreaterThanOrEqual(0.0);
      expect(input.throttle).toBeLessThanOrEqual(1.0);
      expect(input.brake).toBeGreaterThanOrEqual(0.0);
      expect(input.brake).toBeLessThanOrEqual(1.0);

      // Never full throttle and full brake at the same time
      expect(input.throttle > 0.8 && input.brake > 0.8).toBe(false);
    }
  });

  it('triggers standstill recovery respawn when car is stopped for 3 seconds', () => {
    const ai = new AiDriver({ driver: driverConfig, racingLine, seed: 555 });
    const stoppedReadout: AiVehicleReadout = {
      x: 0,
      z: 0,
      heading: 0,
      speed: 0.5,
      lateralSpeed: 0,
    };

    // Initially no respawn pending
    expect(ai.checkRespawn()).toBeNull();

    // 2.9 seconds of standstill (174 steps)
    for (let i = 0; i < 174; i++) {
      ai.update(stoppedReadout, 0, 'Running', 1 / 60);
      expect(ai.checkRespawn()).toBeNull();
    }

    // Pass 3.0s threshold
    for (let i = 0; i < 10; i++) {
      ai.update(stoppedReadout, 0, 'Running', 1 / 60);
    }

    const respawn = ai.checkRespawn();
    expect(respawn).not.toBeNull();
    expect(respawn?.speed).toBeGreaterThan(5.0);
    expect(Number.isFinite(respawn?.x)).toBe(true);
    expect(Number.isFinite(respawn?.z)).toBe(true);
  });
});
