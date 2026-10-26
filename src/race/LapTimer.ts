import { formatLapTime } from '../core/formatLapTime';

export { formatLapTime };

export interface LapTimerState {
  currentLap: number;
  totalLaps: number;
  currentLapTimeMs: number;
  lastLapTimeMs: number | null;
  bestLapTimeMs: number | null;
  isFinished: boolean;
}

/**
 * Deterministic lap timer driven strictly by simulation steps and spline distance.
 *
 * Rules:
 * - Detects crossing the start/finish line in the forward direction using distance wrap-around.
 * - Ignores backward crossings and jitter around the line by requiring at least half a lap
 *   of distance traveled before registering a new lap.
 * - Records current lap time, last lap time, and best lap time.
 */
export class LapTimer {
  private readonly trackLength: number;
  private readonly totalLaps: number;

  private currentLap = 1;
  private currentLapTimeMs = 0;
  private lastLapTimeMs: number | null = null;
  private bestLapTimeMs: number | null = null;
  private isFinished = false;

  private lastDistance: number | null = null;
  private distanceTraveledThisLap = 0;

  constructor(trackLength: number, totalLaps = 3) {
    this.trackLength = Math.max(1, trackLength);
    this.totalLaps = Math.max(1, totalLaps);
  }

  public reset(startingDistance = 0): void {
    this.currentLap = 1;
    this.currentLapTimeMs = 0;
    this.lastLapTimeMs = null;
    this.bestLapTimeMs = null;
    this.isFinished = false;
    this.lastDistance = startingDistance;
    this.distanceTraveledThisLap = 0;
  }

  public update(distanceAlongTrack: number, dt: number): void {
    if (this.isFinished || dt <= 0) return;

    this.currentLapTimeMs += dt * 1000;

    if (this.lastDistance === null) {
      this.lastDistance = distanceAlongTrack;
      return;
    }

    const prev = this.lastDistance;
    const curr = distanceAlongTrack;
    const L = this.trackLength;

    // Detect forward wrap-around: crossing from near end of track to near start
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

    if (isForwardWrap) {
      // Must have traversed at least about half the lap to prevent jitter near the line
      const minLapDistance = L * 0.45;
      if (this.distanceTraveledThisLap >= minLapDistance) {
        // HOOK: Week 3 checkpoint validation will verify that all checkpoints were crossed in order

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
      }
    }

    this.lastDistance = curr;
  }

  public getState(): Readonly<LapTimerState> {
    return {
      currentLap: this.currentLap,
      totalLaps: this.totalLaps,
      currentLapTimeMs: this.currentLapTimeMs,
      lastLapTimeMs: this.lastLapTimeMs,
      bestLapTimeMs: this.bestLapTimeMs,
      isFinished: this.isFinished,
    };
  }
}
