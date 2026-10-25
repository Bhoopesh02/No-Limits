import { clamp } from '../core/clamp';
import { CarData } from '../data/CarData';
import { InputState } from '../data/InputState';
import { updateDriftScore } from './DriftScore';
import { updateNitro } from './Nitro';
import { VehicleState } from './VehicleState';

const BRAKE_DECEL = 35.0; // m/s^2 braking rate
const HANDBRAKE_DECEL = 14.0; // m/s^2 deceleration from handbrake drag
const STEER_SLEW_RATE = 5.5; // rad/s rate of change for steering rack angle

/**
 * Arcade vehicle physical model implementing:
 * - Engine power torque curve & aerodynamic drag balancing
 * - Non-reversing proportional braking
 * - Ackermann/Bicycle steering kinematics with speed falloff
 * - Lateral slip, drift hysteresis, and handbrake kick-out
 * - Nitro boost with speed ceiling expansion and cooldown
 * - Pure, deterministic 60 Hz integration with zero allocations
 */
export class VehicleModel {
  public static step(state: VehicleState, input: InputState, carData: CarData, dt: number): void {
    if (dt <= 0) return;

    // 1) Read input
    const { throttle, brake, steer, handbrake, nitro } = VehicleModel.readInput(input);

    // 2) Engine force from normalized torque curve, limited by top speed and drag
    VehicleModel.applyEngineForce(state, throttle, carData, dt);

    // 3) Braking (reaches zero, never reverses)
    VehicleModel.applyBraking(state, brake, handbrake, dt);

    // 4) Steering with bicycle model; steering angle approaches target at limited rate; max angle falls with speed
    VehicleModel.applySteering(state, steer, carData, dt);

    // 5) Lateral grip: drift mode decay vs normal fast decay, handbrake grip reduction
    VehicleModel.applyLateralGrip(state, handbrake, steer, carData, dt);

    // 6) Nitro boost with duration and cooldown; raises acceleration and speed cap while active
    VehicleModel.applyNitro(state, nitro, carData, dt);

    // 7) Integrate position from forward and lateral velocity
    VehicleModel.integratePosition(state, dt);

    // HOOK: Track limits resolution against spline barriers and off-road (Task 7)

    // 8) Write state
    VehicleModel.writeFinalState(state);
  }

  /**
   * Step 1: Read input values.
   */
  private static readInput(input: InputState): {
    throttle: number;
    brake: number;
    steer: number;
    handbrake: boolean;
    nitro: boolean;
  } {
    return {
      throttle: clamp(input.throttle, 0, 1),
      brake: clamp(input.brake, 0, 1),
      steer: clamp(input.steer, -1, 1),
      handbrake: Boolean(input.handbrake),
      nitro: Boolean(input.nitro),
    };
  }

  /**
   * Step 2: Engine drive force from power curve and balancing aerodynamic drag.
   */
  private static applyEngineForce(
    state: VehicleState,
    throttle: number,
    carData: CarData,
    dt: number,
  ): void {
    const normalTopSpeed = carData.topSpeed;
    const speedRatio = clamp(state.forwardSpeed / normalTopSpeed, 0, 1);

    // Linear interpolation through normalized powerCurve buckets
    const curve = carData.powerCurve;
    const maxIdx = curve.length - 1;
    const samplePos = speedRatio * maxIdx;
    const i0 = Math.floor(samplePos);
    const i1 = Math.min(maxIdx, i0 + 1);
    const frac = samplePos - i0;
    const torque = curve[i0] * (1.0 - frac) + curve[i1] * frac;

    // Drive acceleration: F = m * a -> a = F / m
    const baseAccel = (carData.engineForce / carData.mass) * torque;
    const driveAccel = throttle * baseAccel;

    // Aerodynamic drag: balances engine force at top speed
    const terminalDragAccel =
      (carData.engineForce / carData.mass) * curve[maxIdx] * (speedRatio * speedRatio);

    // Coasting rolling resistance when no throttle is commanded
    let coastDecel = 0;
    if (throttle === 0 && state.forwardSpeed > 0) {
      coastDecel = (carData.drag || 0.32) * 6.0 * speedRatio + 1.2;
    }

    const netAccel = driveAccel - terminalDragAccel - coastDecel;
    state.forwardSpeed += netAccel * dt;

    if (state.forwardSpeed < 0) {
      state.forwardSpeed = 0;
    }
  }

  /**
   * Step 3: Braking (reaches zero, never reverses).
   */
  private static applyBraking(
    state: VehicleState,
    brake: number,
    handbrake: boolean,
    dt: number,
  ): void {
    if (brake > 0) {
      state.forwardSpeed -= brake * BRAKE_DECEL * dt;
    }
    if (handbrake) {
      state.forwardSpeed -= HANDBRAKE_DECEL * dt;
    }
    if (state.forwardSpeed < 0) {
      state.forwardSpeed = 0;
    }
  }

  /**
   * Step 4: Bicycle model steering with slew rate limiting and speed falloff.
   */
  private static applySteering(
    state: VehicleState,
    steerInput: number,
    carData: CarData,
    dt: number,
  ): void {
    // Max angle shrinks with speed to preserve high-speed control
    const speedRatio = state.forwardSpeed / carData.topSpeed;
    const falloff = 1.0 / (1.0 + speedRatio * carData.steerSpeedFalloff * 4.0);
    // steerInput: -1 is left (positive heading around Y), +1 is right (negative heading)
    const targetAngle = -steerInput * carData.maxSteerAngle * falloff;

    // Rate-limited steering rack response
    const angleDiff = targetAngle - state.steerAngle;
    const maxDelta = STEER_SLEW_RATE * dt;
    state.steerAngle += clamp(angleDiff, -maxDelta, maxDelta);

    // Kinematic bicycle model yaw rate: psi_dot = (v / L) * tan(delta)
    if (state.forwardSpeed > 0.1) {
      const L = Math.max(1.0, carData.wheelbase);
      const yawRate = (state.forwardSpeed / L) * Math.tan(state.steerAngle);
      state.heading += yawRate * dt;

      // Wrap heading to [-PI, PI]
      if (state.heading > Math.PI) {
        state.heading -= Math.PI * 2;
      } else if (state.heading < -Math.PI) {
        state.heading += Math.PI * 2;
      }

      // Steering dynamically induces lateral slip in rotating chassis frame
      const maxCentripetalAccel = carData.grip * 1.25;
      const lateralPush = clamp(
        yawRate * state.forwardSpeed * 0.15,
        -maxCentripetalAccel,
        maxCentripetalAccel,
      );
      state.lateralSpeed += lateralPush * dt;

      // Realistic arcade maximum sideways slide velocity
      const maxSlipVelocity = carData.driftEntrySlip * 2.5;
      state.lateralSpeed = clamp(state.lateralSpeed, -maxSlipVelocity, maxSlipVelocity);
    }
  }

  /**
   * Step 5: Lateral grip decay, drift evaluation and handbrake grip reduction.
   */
  private static applyLateralGrip(
    state: VehicleState,
    handbrake: boolean,
    steerInput: number,
    carData: CarData,
    dt: number,
  ): void {
    // Handbrake breaks rear traction on turn-in
    if (handbrake && Math.abs(steerInput) > 0.1 && state.forwardSpeed > 8.0) {
      // Kick rear out into drift up to maximum slip ceiling
      const maxSlip = carData.driftEntrySlip * 2.2;
      const kickDirection = -Math.sign(steerInput);
      if (Math.abs(state.lateralSpeed) < maxSlip) {
        state.lateralSpeed += kickDirection * 18.0 * dt;
      }
    }

    // Update drift state & score accumulation
    updateDriftScore(state, carData.driftEntrySlip, carData.driftExitSlip, dt);

    // Effective lateral grip
    let effectiveGrip = carData.grip;
    if (handbrake) {
      effectiveGrip *= carData.handbrakeGripFactor;
    } else if (state.isDrifting) {
      // When driver straightens the wheel, tires bite and grip recovers to catch the slide
      const isStraight = Math.abs(steerInput) < 0.1;
      effectiveGrip *= isStraight ? 1.2 : carData.driftGripFactor;
    } else {
      // Normal non-drifting grip rapidly arrests any remaining lateral slip
      effectiveGrip *= 5.0;
    }

    // Apply friction decay to lateral velocity
    const lateralDecay = effectiveGrip * dt;
    if (Math.abs(state.lateralSpeed) <= lateralDecay) {
      state.lateralSpeed = 0;
    } else {
      state.lateralSpeed -= Math.sign(state.lateralSpeed) * lateralDecay;
    }
  }

  /**
   * Step 6: Nitro boost with duration and cooldown.
   */
  private static applyNitro(
    state: VehicleState,
    wantsNitro: boolean,
    carData: CarData,
    dt: number,
  ): void {
    updateNitro(
      state,
      wantsNitro,
      carData.nitroDuration,
      carData.nitroCooldown,
      carData.nitroFillRate,
      carData.maxNitro,
      dt,
    );

    if (state.nitroActiveTime > 0) {
      // Nitro pushes acceleration and increases speed cap
      const nitroCap = carData.topSpeed * carData.nitroBoostTopSpeed;
      state.forwardSpeed += carData.nitroBoostAccel * carData.nitroStrength * dt;
      if (state.forwardSpeed > nitroCap) {
        state.forwardSpeed = nitroCap;
      }
    } else {
      // Cap at normal top speed
      if (state.forwardSpeed > carData.topSpeed) {
        state.forwardSpeed = Math.max(carData.topSpeed, state.forwardSpeed - 15.0 * dt);
      }
    }
  }

  /**
   * Step 7: Integrate world position from forward and lateral velocities.
   */
  private static integratePosition(state: VehicleState, dt: number): void {
    if (state.forwardSpeed !== 0 || state.lateralSpeed !== 0) {
      const fwdX = -Math.sin(state.heading);
      const fwdZ = -Math.cos(state.heading);
      const rightX = Math.cos(state.heading);
      const rightZ = -Math.sin(state.heading);

      const vx = fwdX * state.forwardSpeed + rightX * state.lateralSpeed;
      const vz = fwdZ * state.forwardSpeed + rightZ * state.lateralSpeed;

      state.x += vx * dt;
      state.z += vz * dt;
    }
  }

  /**
   * Step 8: Write total speed and guard against numerical instability.
   */
  private static writeFinalState(state: VehicleState): void {
    state.speed = Math.hypot(state.forwardSpeed, state.lateralSpeed);

    // Numerical safety guard: guarantee finite values
    if (!Number.isFinite(state.x)) state.x = 0;
    if (!Number.isFinite(state.y)) state.y = 0;
    if (!Number.isFinite(state.z)) state.z = 0;
    if (!Number.isFinite(state.heading)) state.heading = 0;
    if (!Number.isFinite(state.forwardSpeed)) state.forwardSpeed = 0;
    if (!Number.isFinite(state.lateralSpeed)) state.lateralSpeed = 0;
    if (!Number.isFinite(state.speed)) state.speed = 0;
    if (!Number.isFinite(state.steerAngle)) state.steerAngle = 0;
  }
}
