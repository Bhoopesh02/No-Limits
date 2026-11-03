export interface CheckpointState {
  readonly nextExpectedCheckpoint: number;
  readonly checkpointsPassedThisLap: number;
  readonly totalCheckpoints: number;
}

export interface CheckpointUpdateResult {
  checkpointPassed: number | null;
  lapCompleted: boolean;
}

/**
 * Deterministic checkpoint tracker.
 *
 * Rules:
 * - Checkpoints are evenly spaced along the track spline, with checkpoint 0 at start/finish.
 * - Checkpoints must be passed forward and in strictly sequential order.
 * - Crossing the finish line only completes a lap if every checkpoint was passed in order.
 * - Jitter and reverse crossings are safely rejected.
 * - Zero allocations during update.
 */
export class Checkpoints {
  private readonly trackLength: number;
  private readonly checkpointCount: number;
  private readonly checkpointDistances: Float64Array;

  private nextExpected = 1;
  private checkpointsPassedThisLap = 0;
  private lastDistance: number | null = null;

  // Reusable result object to avoid allocations in simulation steps
  private readonly result: CheckpointUpdateResult = {
    checkpointPassed: null,
    lapCompleted: false,
  };

  constructor(trackLength: number, checkpointCount = 8) {
    this.trackLength = Math.max(1, trackLength);
    this.checkpointCount = Math.max(2, checkpointCount);

    this.checkpointDistances = new Float64Array(this.checkpointCount);
    for (let i = 0; i < this.checkpointCount; i++) {
      this.checkpointDistances[i] = (i / this.checkpointCount) * this.trackLength;
    }
  }

  public getCheckpointCount(): number {
    return this.checkpointCount;
  }

  public getCheckpointDistance(index: number): number {
    if (index < 0 || index >= this.checkpointCount) return 0;
    return this.checkpointDistances[index];
  }

  public getState(): CheckpointState {
    return {
      nextExpectedCheckpoint: this.nextExpected,
      checkpointsPassedThisLap: this.checkpointsPassedThisLap,
      totalCheckpoints: this.checkpointCount,
    };
  }

  public reset(startingDistance = 0): void {
    this.nextExpected = 1;
    this.checkpointsPassedThisLap = 0;
    this.lastDistance = startingDistance;
    this.result.checkpointPassed = null;
    this.result.lapCompleted = false;
  }

  public update(distanceAlongTrack: number): CheckpointUpdateResult {
    this.result.checkpointPassed = null;
    this.result.lapCompleted = false;

    if (this.lastDistance === null) {
      this.lastDistance = distanceAlongTrack;
      return this.result;
    }

    const prev = this.lastDistance;
    const curr = distanceAlongTrack;
    const L = this.trackLength;

    let forwardDelta = curr - prev;
    if (forwardDelta < -L * 0.5) {
      forwardDelta += L;
    } else if (forwardDelta > L * 0.5) {
      forwardDelta -= L;
    }

    this.lastDistance = curr;

    // Reject non-forward movement
    if (forwardDelta <= 0) {
      return this.result;
    }

    // Check if the finish line (checkpoint 0) was crossed forward
    let distToFinish = 0 - prev;
    if (distToFinish < 0) {
      distToFinish += L;
    }
    const finishLineCrossed = distToFinish > 0 && distToFinish <= forwardDelta;

    const spacing = L / this.checkpointCount;

    // Check if next expected checkpoint was crossed forward
    const targetDist = this.checkpointDistances[this.nextExpected];
    let distToTarget = targetDist - prev;
    if (distToTarget < 0) {
      distToTarget += L;
    }

    // Checkpoint crossed forward if targetDist was passed within this step
    // and the car landed within this checkpoint's segment (didn't skip it entirely)
    if (distToTarget > 0 && distToTarget <= forwardDelta) {
      let distPastTarget = curr - targetDist;
      if (distPastTarget < 0) {
        distPastTarget += L;
      }

      if (distPastTarget < spacing) {
        const expected = this.nextExpected;
        this.result.checkpointPassed = expected;

        if (expected === 0) {
          if (this.checkpointsPassedThisLap === this.checkpointCount - 1) {
            this.result.lapCompleted = true;
          }
          this.checkpointsPassedThisLap = 0;
          this.nextExpected = 1;
        } else {
          this.checkpointsPassedThisLap++;
          this.nextExpected = (this.nextExpected + 1) % this.checkpointCount;
        }
      }
    }

    // If finish line was crossed but lap was NOT completed (checkpoints were skipped):
    // The finish line crossing is ignored for lap completion, and lap progress is reset
    // so the car must go back around and complete a full lap.
    if (finishLineCrossed && !this.result.lapCompleted) {
      this.checkpointsPassedThisLap = 0;
      this.nextExpected = 1;
    }

    return this.result;
  }
}
