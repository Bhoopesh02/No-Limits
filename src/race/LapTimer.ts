import { formatLapTime } from '../core/formatLapTime';
import { Checkpoints, CheckpointState } from './Checkpoints';

export { formatLapTime };

export interface LapTimerState {
  currentLap: number;
  totalLaps: number;
  currentLapTimeMs: number;
  lastLapTimeMs: number | null;
  bestLapTimeMs: number | null;
  isFinished: boolean;
  checkpointState: CheckpointState;
}

/**
 * Deterministic lap timer driven strictly by simulation steps and checkpoint verification.
 *
 * Rules:
 * - Delegates checkpoint order and lap completion to Checkpoints.
 * - Enforces minimum distance traveled safety check to prevent jitter near the finish line.
 * - Records current lap time, last lap time, and best lap time in simulation steps.
 */
export class LapTimer {
  private readonly trackLength: number;
  private readonly totalLaps: number;
  private readonly checkpoints: Checkpoints;

  private currentLap = 1;
  private currentLapTimeMs = 0;
  private lastLapTimeMs: number | null = null;
  private bestLapTimeMs: number | null = null;
  private isFinished = false;

  private lastDistance: number | null = null;
  private distanceTraveledThisLap = 0;

  constructor(trackLength: number, totalLaps = 3, checkpointCount = 8) {
    this.trackLength = Math.max(1, trackLength);
    this.totalLaps = Math.max(1, totalLaps);
    this.checkpoints = new Checkpoints(this.trackLength, checkpointCount);
  }

  public reset(startingDistance = 0): void {
    this.currentLap = 1;
    this.currentLapTimeMs = 0;
    this.lastLapTimeMs = null;
    this.bestLapTimeMs = null;
    this.isFinished = false;
    this.lastDistance = startingDistance;
    this.distanceTraveledThisLap = 0;
    this.checkpoints.reset(startingDistance);
  }

  public getCheckpoints(): Checkpoints {
    return this.checkpoints;
  }

  public update(distanceAlongTrack: number, dt: number): boolean {
    if (this.isFinished || dt <= 0) return false;

    this.currentLapTimeMs += dt * 1000;

    if (this.lastDistance === null) {
      this.lastDistance = distanceAlongTrack;
      this.checkpoints.update(distanceAlongTrack);
      return false;
    }

    const prev = this.lastDistance;
    const curr = distanceAlongTrack;
    const L = this.trackLength;

    const isForwardWrap = prev > L * 0.7 && curr < L * 0.3;
    const isBackwardWrap = prev < L * 0.3 && curr > L * 0.7;

    let delta = 0;
    if (isForwardWrap) {
      delta = curr + L - prev;
    } else if (isBackwardWrap) {
      delta = curr - (prev + L);
    } else {
      delta = curr - prev;
    }

    if (delta > 0) {
      this.distanceTraveledThisLap += delta;
    }
    this.lastDistance = curr;

    const cpResult = this.checkpoints.update(distanceAlongTrack);

    if (cpResult.lapCompleted) {
      const minLapDistance = L * 0.45;
      if (this.distanceTraveledThisLap >= minLapDistance) {
        this.lastLapTimeMs = this.currentLapTimeMs;
        if (this.bestLapTimeMs === null || this.lastLapTimeMs < this.bestLapTimeMs) {
          this.bestLapTimeMs = this.lastLapTimeMs;
        }

        if (this.currentLap >= this.totalLaps) {
          this.isFinished = true;
        } else {
          this.currentLap++;
          this.currentLapTimeMs = 0;
          this.distanceTraveledThisLap = 0;
        }
        return true;
      }
    }

    return false;
  }

  public getState(): LapTimerState {
    return {
      currentLap: this.currentLap,
      totalLaps: this.totalLaps,
      currentLapTimeMs: this.currentLapTimeMs,
      lastLapTimeMs: this.lastLapTimeMs,
      bestLapTimeMs: this.bestLapTimeMs,
      isFinished: this.isFinished,
      checkpointState: this.checkpoints.getState(),
    };
  }
}
