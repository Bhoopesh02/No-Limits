import { clamp } from '../core/clamp';
import { Rng } from '../core/Rng';
import type { AiVehicleReadout } from '../data/AiVehicleReadout';
import { createInputState, InputState } from '../data/InputState';
import type { OpponentDriver } from '../data/OpponentRoster';
import type { RacePhase } from '../data/RaceResult';
import {
  AI_BRAKE_POINT_SCALE_MAX,
  AI_BRAKE_POINT_SCALE_MIN,
  AI_BRAKING_DECEL,
  AI_JITTER_UPDATE_INTERVAL_SECONDS,
  AI_LATERAL_JITTER_METERS,
  AI_LOOKAHEAD_MIN_METERS,
  AI_LOOKAHEAD_SPEED_FACTOR,
  AI_RECOVERY_RESPAWN_SPEED,
  AI_RECOVERY_SPEED_THRESHOLD,
  AI_RECOVERY_TIME_THRESHOLD,
  AI_SPEED_JITTER_SCALE,
} from './AiTuning';
import { createEmptyRacingLineSample, RacingLine, RacingLineSample } from './RacingLine';
import { computeRubberBandMultiplier } from './RubberBanding';

export interface AiDriverOptions {
  readonly driver: OpponentDriver;
  readonly racingLine: RacingLine;
  readonly seed?: number;
  readonly initialDistance?: number;
}

export interface AiRespawnPose {
  x: number;
  y: number;
  z: number;
  heading: number;
  speed: number;
  distance: number;
}

/**
 * Pure, deterministic AI Driver producing normalized InputState each simulation step.
 * - Tracks progress via windowed search (O(1) amortized, zero per-step allocation).
 * - Pure pursuit steering towards a dynamic lookahead point on the racing line.
 * - Predictive corner braking and throttle control with zero brake/throttle overlap.
 * - Seeded driver variations (jitter, line bias, skill).
 * - Smooth rubber-banding relative to player race progress.
 * - Automatic recovery respawn after standstill.
 * - Frozen during countdown and after finish.
 */
export class AiDriver {
  public readonly driver: OpponentDriver;
  private readonly racingLine: RacingLine;
  private readonly rng: Rng;

  private currentDistance: number;
  private prevIndex: number;
  private isFinished = false;

  // Standstill recovery
  private standstillTimer = 0;
  private respawnPending = false;
  private readonly respawnPose: AiRespawnPose = {
    x: 0,
    y: 0,
    z: 0,
    heading: 0,
    speed: 0,
    distance: 0,
  };

  // Periodic driver jitter state (updated ~1 Hz, smoothly blended)
  private jitterTimer = 0;
  private currentSpeedJitter = 0;
  private targetSpeedJitter = 0;
  private currentLateralJitter = 0;
  private targetLateralJitter = 0;
  private currentBrakeScale = 1.0;
  private targetBrakeScale = 1.0;

  // Reusable objects for zero-allocation simulation loop
  private readonly reusableInput: InputState = createInputState();
  private readonly tempLookaheadSample: RacingLineSample = createEmptyRacingLineSample();
  private readonly tempCenterSample: RacingLineSample = createEmptyRacingLineSample();

  constructor(options: AiDriverOptions) {
    this.driver = options.driver;
    this.racingLine = options.racingLine;
    this.rng = new Rng((options.seed ?? 1000) + this.driver.seedOffset);

    this.currentDistance = options.initialDistance ?? 0;
    this.prevIndex = Math.floor(
      (this.currentDistance / this.racingLine.trackLength) * this.racingLine.sampleCount,
    );
  }

  public getDistanceAlongTrack(): number {
    return this.currentDistance;
  }

  public setFinished(finished: boolean): void {
    this.isFinished = finished;
  }

  public hasFinished(): boolean {
    return this.isFinished;
  }

  public checkRespawn(): AiRespawnPose | null {
    if (!this.respawnPending) return null;
    this.respawnPending = false;
    return this.respawnPose;
  }

  /**
   * Generates input for the current simulation step.
   *
   * @param readout Current vehicle readout (satisfies AiVehicleReadout).
   * @param playerDistance Current player race progress distance in meters.
   * @param racePhase Current race phase ('Countdown' | 'Running' | 'Finished').
   * @param dt Fixed timestep in seconds (typically 1/60).
   * @param paceScale Global pace modifier (defaults to 1.0).
   */
  public update(
    readout: AiVehicleReadout,
    playerDistance: number,
    racePhase: RacePhase,
    dt: number,
    paceScale = 1.0,
  ): InputState {
    const input = this.reusableInput;

    // 1. Frozen inputs during Countdown or after finish (neutral coast to stop)
    if (racePhase === 'Countdown' || this.isFinished) {
      input.steer = 0;
      input.throttle = 0;
      input.brake = 0;
      input.handbrake = false;
      input.nitro = false;
      return input;
    }

    // 2. Track current progress along racing line via windowed search
    this.updateTrackDistance(readout.x, readout.z);

    // 3. Update driver jitter variation once per interval
    this.updateDriverJitter(dt);

    // 4. Standstill Recovery Check
    if (readout.speed < AI_RECOVERY_SPEED_THRESHOLD) {
      this.standstillTimer += dt;
      if (this.standstillTimer >= AI_RECOVERY_TIME_THRESHOLD) {
        this.triggerRecovery();
      }
    } else {
      this.standstillTimer = Math.max(0, this.standstillTimer - dt * 0.5);
    }

    // 5. Lookahead distance (grows with forward speed)
    const lookaheadDist =
      AI_LOOKAHEAD_MIN_METERS + AI_LOOKAHEAD_SPEED_FACTOR * Math.max(0, readout.speed);
    const targetDist = this.currentDistance + lookaheadDist;

    this.racingLine.sampleAt(targetDist, this.tempLookaheadSample);
    const targetSample = this.tempLookaheadSample;

    // Apply driver lateral preference and smoothed jitter
    const totalLateralOffset =
      targetSample.offset + this.driver.lineBias + this.currentLateralJitter;
    const targetX = targetSample.x + targetSample.normalX * totalLateralOffset;
    const targetZ = targetSample.z + targetSample.normalZ * totalLateralOffset;

    // 6. Pure pursuit steering
    const dx = targetX - readout.x;
    const dz = targetZ - readout.z;

    const heading = readout.heading;
    const rx = Math.cos(heading);
    const rz = -Math.sin(heading);

    // Local coordinates in car frame: localX > 0 is to the right, < 0 is to the left
    const localX = dx * rx + dz * rz;

    // Curvature command: steer input in [-1, 1]
    const steerGain = 1.9;
    const rawSteer = (localX / Math.max(4.0, lookaheadDist)) * steerGain;
    input.steer = clamp(rawSteer, -1.0, 1.0);

    // 7. Speed calculation with rubber-banding and skill
    const baseTargetSpeed = targetSample.targetSpeed * this.driver.skill;
    const gapToPlayer = this.currentDistance - playerDistance;
    const rubberBandScale = computeRubberBandMultiplier(gapToPlayer);

    const effectiveTargetSpeed =
      baseTargetSpeed * (1.0 + this.currentSpeedJitter) * rubberBandScale * paceScale;

    // 8. Braking and Throttle control
    const currentSpeed = readout.speed;
    const speedExcess = currentSpeed - effectiveTargetSpeed;

    if (speedExcess > 0.5) {
      // Predictive corner braking distance
      const requiredBrakeDistance =
        ((currentSpeed * currentSpeed - effectiveTargetSpeed * effectiveTargetSpeed) /
          (2 * AI_BRAKING_DECEL)) *
        this.currentBrakeScale;

      if (lookaheadDist <= requiredBrakeDistance + 3.0) {
        input.brake = clamp((requiredBrakeDistance - lookaheadDist) / 8.0 + 0.4, 0.3, 1.0);
        input.throttle = 0;
      } else {
        input.brake = 0;
        input.throttle = 0.15; // Coasting into entry
      }
    } else {
      // Accelerating out of turn or on straight
      input.brake = 0;
      const speedDeficit = effectiveTargetSpeed - currentSpeed;
      input.throttle = clamp(speedDeficit / 3.5, 0.4, 1.0);
    }

    input.handbrake = false;
    input.nitro = false;
    input.pause = false;

    return input;
  }

  private updateTrackDistance(x: number, z: number): void {
    const n = this.racingLine.sampleCount;
    const l = this.racingLine.trackLength;
    const count = n;

    // Search window of +/- 12 samples around previous index
    const WINDOW = 12;
    let bestIdx = this.prevIndex;
    let minD2 = Infinity;

    for (let offset = -WINDOW; offset <= WINDOW; offset++) {
      const idx = (((this.prevIndex + offset) % count) + count) % count;
      this.racingLine.sampleAt((idx / count) * l, this.tempCenterSample);
      const dx = x - this.tempCenterSample.x;
      const dz = z - this.tempCenterSample.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < minD2) {
        minD2 = d2;
        bestIdx = idx;
      }
    }

    // Fall back to coarse global search only if off-track (> 40m away)
    if (minD2 > 40 * 40) {
      for (let i = 0; i < count; i += 6) {
        this.racingLine.sampleAt((i / count) * l, this.tempCenterSample);
        const dx = x - this.tempCenterSample.x;
        const dz = z - this.tempCenterSample.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < minD2) {
          minD2 = d2;
          bestIdx = i;
        }
      }
    }

    this.prevIndex = bestIdx;
    const sampleDist = (bestIdx / count) * l;
    this.racingLine.sampleAt(sampleDist, this.tempCenterSample);

    const dx = x - this.tempCenterSample.x;
    const dz = z - this.tempCenterSample.z;
    const forwardProj = dx * this.tempCenterSample.tangentX + dz * this.tempCenterSample.tangentZ;

    this.currentDistance = this.racingLine.wrap(sampleDist + forwardProj);
  }

  private updateDriverJitter(dt: number): void {
    this.jitterTimer += dt;
    if (this.jitterTimer >= AI_JITTER_UPDATE_INTERVAL_SECONDS) {
      this.jitterTimer -= AI_JITTER_UPDATE_INTERVAL_SECONDS;

      this.targetSpeedJitter = this.rng.nextSigned() * AI_SPEED_JITTER_SCALE;
      this.targetLateralJitter = this.rng.nextSigned() * AI_LATERAL_JITTER_METERS;
      this.targetBrakeScale = this.rng.nextRange(
        AI_BRAKE_POINT_SCALE_MIN,
        AI_BRAKE_POINT_SCALE_MAX,
      );
    }

    // Smooth blend towards targets (no abrupt steps)
    const blendFactor = clamp(dt * 2.0, 0, 1);
    this.currentSpeedJitter += (this.targetSpeedJitter - this.currentSpeedJitter) * blendFactor;
    this.currentLateralJitter +=
      (this.targetLateralJitter - this.currentLateralJitter) * blendFactor;
    this.currentBrakeScale += (this.targetBrakeScale - this.currentBrakeScale) * blendFactor;
  }

  private triggerRecovery(): void {
    const targetDist = this.racingLine.wrap(this.currentDistance + 6.0);
    this.racingLine.sampleAt(targetDist, this.tempCenterSample);
    const heading = Math.atan2(-this.tempCenterSample.tangentX, -this.tempCenterSample.tangentZ);

    this.respawnPose.x = this.tempCenterSample.x;
    this.respawnPose.y = this.tempCenterSample.y;
    this.respawnPose.z = this.tempCenterSample.z;
    this.respawnPose.heading = heading;
    this.respawnPose.speed = AI_RECOVERY_RESPAWN_SPEED;
    this.respawnPose.distance = targetDist;

    this.respawnPending = true;
    this.standstillTimer = 0;
  }
}
