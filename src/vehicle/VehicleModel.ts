import { clamp } from '../core/clamp';
import { CarData } from '../data/CarData';
import { InputState } from '../data/InputState';
import { TrackLimiter } from '../data/TrackLimiter';
import { updateDriftScore } from './DriftScore';
import { updateNitro } from './Nitro';
import { VehicleState } from './VehicleState';

const BRAKE_DECEL = 35.0; // m/s^2 braking rate
const HANDBRAKE_DECEL = 14.0; // m/s^2 deceleration from handbrake drag

/**
 * Arcade vehicle physical model implementing:
 * - Engine power torque curve & aerodynamic drag balancing
 * - Proportional braking and derived reverse driving
 * - Signed speed (positive forward, negative backward)
 * - Ackermann/Bicycle steering kinematics with speed falloff and reverse inversion
 * - Lateral slip, drift hysteresis, and handbrake kick-out
 * - Nitro boost with speed ceiling expansion and cooldown
 * - Pure, deterministic 60 Hz integration with zero allocations
 */
export class VehicleModel {
  public static step(
    state: VehicleState,
    input: InputState,
    carData: CarData,
    dt: number,
    limiter?: TrackLimiter,
  ): void {
    if (dt <= 0) return;

    // 1) Read input
    const { throttle, brake, steer, handbrake, nitro, isAnalog } = VehicleModel.readInput(input);

    // 2 & 3) Longitudinal powertrain forces (forward engine force, reverse acceleration, braking)
    VehicleModel.applyLongitudinalForces(state, throttle, brake, handbrake, carData, dt);

    // 4 & 7) Steering with bicycle model, smoothed yaw, and velocity frame decomposition
    VehicleModel.applySteering(state, steer, isAnalog, carData, dt);

    // 5) Lateral grip: drift mode decay vs normal fast decay, handbrake grip reduction
    VehicleModel.applyLateralGrip(state, handbrake, carData, dt);

    // 6) Nitro boost with duration and cooldown; raises acceleration and speed cap while active
    VehicleModel.applyNitro(state, nitro, carData, dt);

    // 7) Integrate position from forward and lateral velocity
    VehicleModel.integratePosition(state, dt);

    // HOOK: Track limits resolution against spline barriers and off-road (Task 7)
    if (limiter) {
      limiter.resolve(state, dt);
    }

    // 8) Compute isReversing flag (derived from reverse speed or reverse command at standstill)
    state.isReversing =
      state.forwardSpeed < -0.01 ||
      (brake > 0 && throttle === 0 && state.forwardSpeed <= 0.05);

    // 9) Write state and compute signed planar speed
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
    isAnalog: boolean;
  } {
    const rawSteer = clamp(input.steer, -1, 1);
    const isAnalog =
      Boolean((input as { isAnalog?: boolean }).isAnalog) ||
      (rawSteer !== 0 && rawSteer !== 1 && rawSteer !== -1);
    return {
      throttle: clamp(input.throttle, 0, 1),
      brake: clamp(input.brake, 0, 1),
      steer: rawSteer,
      handbrake: Boolean(input.handbrake),
      nitro: Boolean(input.nitro),
      isAnalog,
    };
  }

  /**
   * Steps 2 & 3: Longitudinal forces:
   * - Forward driving with normalized torque curve and aerodynamic drag
   * - Derived reverse when brake > 0, throttle == 0, and forwardSpeed <= 1 m/s
   * - Reverse braking when moving backward and throttle > 0
   * - Capped reverse speed and reverse acceleration
   */
  private static applyLongitudinalForces(
    state: VehicleState,
    throttle: number,
    brake: number,
    handbrake: boolean,
    carData: CarData,
    dt: number,
  ): void {
    if (state.forwardSpeed < 0) {
      // -----------------------------------------------------------------
      // Moving backward (reversing)
      // -----------------------------------------------------------------
      if (throttle > 0) {
        // If moving backward and throttle > 0, apply braking force first towards zero
        const brakeDecel = throttle * BRAKE_DECEL * dt;
        state.forwardSpeed += brakeDecel;

        // If speed crossed zero, begin accelerating forward
        if (state.forwardSpeed >= 0) {
          const speedRatio = clamp(state.forwardSpeed / carData.topSpeed, 0, 1);
          const curve = carData.powerCurve;
          const maxIdx = curve.length - 1;
          const samplePos = speedRatio * maxIdx;
          const i0 = Math.floor(samplePos);
          const i1 = Math.min(maxIdx, i0 + 1);
          const frac = samplePos - i0;
          const torque = curve[i0] * (1.0 - frac) + curve[i1] * frac;
          const baseAccel = (carData.engineForce / carData.mass) * torque;
          state.forwardSpeed += throttle * baseAccel * dt;
        }
      } else if (brake > 0) {
        // Continue accelerating backward using reverseAccel, capped at reverseTopSpeed
        state.forwardSpeed -= brake * carData.reverseAccel * dt;
        if (state.forwardSpeed < -carData.reverseTopSpeed) {
          state.forwardSpeed = -carData.reverseTopSpeed;
        }
      } else {
        // Coasting rolling resistance while reversing
        const speedRatio = Math.abs(state.forwardSpeed) / carData.reverseTopSpeed;
        const coastDecel = (carData.drag || 0.32) * 6.0 * speedRatio + 1.2;
        state.forwardSpeed += coastDecel * dt;
        if (state.forwardSpeed > 0) {
          state.forwardSpeed = 0;
        }
      }

      // Handbrake while reversing
      if (handbrake) {
        state.forwardSpeed += HANDBRAKE_DECEL * dt;
        if (state.forwardSpeed > 0) {
          state.forwardSpeed = 0;
        }
      }
    } else {
      // -----------------------------------------------------------------
      // Stationary or moving forward (forwardSpeed >= 0)
      // -----------------------------------------------------------------
      if (brake > 0 && throttle === 0 && state.forwardSpeed <= 1.0) {
        // Reverse is derived: when brake > 0, throttle == 0, and forward speed <= 1 m/s,
        // the car accelerates backward with reverseAccel up to reverseTopSpeed.
        state.forwardSpeed -= brake * carData.reverseAccel * dt;
        if (state.forwardSpeed < -carData.reverseTopSpeed) {
          state.forwardSpeed = -carData.reverseTopSpeed;
        }
      } else {
        // Forward engine drive force
        if (throttle > 0) {
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

          const baseAccel = (carData.engineForce / carData.mass) * torque;
          const driveAccel = throttle * baseAccel;

          const terminalDragAccel =
            (carData.engineForce / carData.mass) * curve[maxIdx] * (speedRatio * speedRatio);

          state.forwardSpeed += (driveAccel - terminalDragAccel) * dt;
        }

        // Coasting rolling resistance when no throttle is commanded
        if (throttle === 0 && state.forwardSpeed > 0) {
          const speedRatio = clamp(state.forwardSpeed / carData.topSpeed, 0, 1);
          const coastDecel = (carData.drag || 0.32) * 6.0 * speedRatio + 1.2;
          state.forwardSpeed -= coastDecel * dt;
          if (state.forwardSpeed < 0) {
            state.forwardSpeed = 0;
          }
        }

        // Forward braking (slows to 0; does not cross below 0 while speed > 1 m/s)
        if (brake > 0) {
          state.forwardSpeed -= brake * BRAKE_DECEL * dt;
          if (state.forwardSpeed < 0) {
            state.forwardSpeed = 0;
          }
        }

        // Handbrake deceleration
        if (handbrake) {
          state.forwardSpeed -= HANDBRAKE_DECEL * dt;
          if (state.forwardSpeed < 0) {
            state.forwardSpeed = 0;
          }
        }
      }
    }
  }

  /**
   * Steps 4 & 7: Bicycle model steering with smoothed yaw rate and velocity frame decomposition.
   */
  private static applySteering(
    state: VehicleState,
    steerInput: number,
    isAnalog: boolean,
    carData: CarData,
    dt: number,
  ): void {
    const steerSign = carData.steerSign ?? carData.STEER_SIGN ?? 1;
    const pressRate = carData.steerPressRate ?? carData.PRESS_RATE ?? 4.0;
    const returnRate = carData.steerReturnRate ?? carData.RETURN_RATE ?? 7.0;
    const maxSteerAngle = carData.maxSteerAngle ?? carData.MAX_ANGLE ?? (30 * Math.PI) / 180;
    const minSteerAngle = carData.minSteerAngle ?? carData.MIN_ANGLE ?? (5 * Math.PI) / 180;
    const yawResponse = carData.yawResponse ?? carData.YAW_RESPONSE ?? 12.0;
    const minYawSpeed = carData.minYawSpeed ?? carData.MIN_YAW_SPEED ?? 1.5;
    const wheelbase = Math.max(1.0, carData.wheelbase ?? 2.7);

    state.steerInput = Number.isFinite(state.steerInput) ? state.steerInput : 0;
    state.angularVelocity = Number.isFinite(state.angularVelocity) ? state.angularVelocity : 0;

    // 1. Input to steerInput (-1..1)
    if (isAnalog) {
      // Analog input (gamepad stick, touch, tilt) skips ramp and uses normalized deflection directly
      // In InputState, negative steer is left, positive is right. Positive steerInput turns left.
      state.steerInput = clamp(-steerInput * steerSign, -1, 1);
    } else {
      const left = steerInput <= -0.5;
      const right = steerInput >= 0.5;
      let target = 0;
      if (left && !right) {
        target = 1;
      } else if (right && !left) {
        target = -1;
      }
      target *= steerSign;

      if (state.steerInput !== target) {
        const isReversingOrReleasing =
          target === 0 ||
          (state.steerInput !== 0 && Math.sign(state.steerInput) !== Math.sign(target)) ||
          Math.abs(target) < Math.abs(state.steerInput);
        const rate = isReversingOrReleasing ? returnRate : pressRate;
        const maxDelta = rate * dt;
        if (Math.abs(target - state.steerInput) <= maxDelta) {
          state.steerInput = target;
        } else {
          state.steerInput += Math.sign(target - state.steerInput) * maxDelta;
        }
      }
    }

    // 2. Wheel angle: t = min(|speed| / 60, 1); maxAngle = lerp(30 deg, 5 deg, t * t); steerAngle = steerInput * maxAngle
    const t = Math.min(Math.abs(state.forwardSpeed) / 60, 1);
    const maxAngle = maxSteerAngle + (minSteerAngle - maxSteerAngle) * (t * t);
    state.steerAngle = state.steerInput * maxAngle;

    // 3. Yaw (bicycle model): effSpeed = max(|speed|, 4) * sign(speed or 1); targetYaw = (effSpeed / WHEELBASE) * tan(steerAngle)
    const speedSign = state.forwardSpeed < 0 ? -1 : 1;
    const effSpeed = Math.max(Math.abs(state.forwardSpeed), 4) * speedSign;
    const targetYaw = (effSpeed / wheelbase) * Math.tan(state.steerAngle);

    // 4. Smooth yaw: angularVelocity += (targetYaw - angularVelocity) * (1 - exp(-12 * dt))
    state.angularVelocity +=
      (targetYaw - state.angularVelocity) * (1 - Math.exp(-yawResponse * dt));

    // 5. Heading: heading += angularVelocity * min(|speed| / 1.5, 1) * dt
    const speedFactor = Math.min(Math.abs(state.forwardSpeed) / minYawSpeed, 1);
    const headingDelta = state.angularVelocity * speedFactor * dt;
    state.heading += headingDelta;

    // Wrap heading to [-PI, PI]
    while (state.heading > Math.PI) state.heading -= Math.PI * 2;
    while (state.heading < -Math.PI) state.heading += Math.PI * 2;

    // 7. Run steering BEFORE velocity is decomposed into forward and right vectors, so slip is computed against new heading
    if (Math.abs(state.forwardSpeed) > 0.1) {
      const maxCentripetalAccel = carData.grip * 1.25;
      const slipAccel = clamp(
        state.angularVelocity * Math.abs(state.forwardSpeed) * 0.15,
        -maxCentripetalAccel,
        maxCentripetalAccel,
      );
      state.lateralSpeed += slipAccel * dt;

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
    carData: CarData,
    dt: number,
  ): void {
    // Handbrake breaks rear traction on turn-in during forward driving
    if (handbrake && Math.abs(state.steerInput) > 0.1 && state.forwardSpeed > 8.0) {
      const maxSlip = carData.driftEntrySlip * 2.2;
      const kickDirection = state.steerInput > 0 ? 1 : -1;
      if (Math.abs(state.lateralSpeed) < maxSlip) {
        state.lateralSpeed += kickDirection * 18.0 * dt;
      }
    }

    // Update drift state & score accumulation (only while forward and not reversing)
    updateDriftScore(state, carData.driftEntrySlip, carData.driftExitSlip, dt);

    // Effective lateral grip
    let effectiveGrip = carData.grip;
    if (handbrake) {
      effectiveGrip *= carData.handbrakeGripFactor;
    } else if (state.isDrifting) {
      const isStraight = Math.abs(state.steerInput) < 0.1;
      effectiveGrip *= isStraight ? 1.2 : carData.driftGripFactor;
    } else {
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

    if (state.nitroActiveTime > 0 && state.forwardSpeed >= 0) {
      // Nitro pushes acceleration and increases speed cap
      const nitroCap = carData.topSpeed * carData.nitroBoostTopSpeed;
      state.forwardSpeed += carData.nitroBoostAccel * carData.nitroStrength * dt;
      if (state.forwardSpeed > nitroCap) {
        state.forwardSpeed = nitroCap;
      }
    } else if (state.forwardSpeed > carData.topSpeed) {
      // Cap at normal top speed
      state.forwardSpeed = Math.max(carData.topSpeed, state.forwardSpeed - 15.0 * dt);
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
   * Step 8: Write total signed planar speed and guard against numerical instability.
   */
  private static writeFinalState(state: VehicleState): void {
    const planarSpeed = Math.hypot(state.forwardSpeed, state.lateralSpeed);
    state.speed = state.forwardSpeed < 0 ? -planarSpeed : planarSpeed;

    // Numerical safety guard: guarantee finite values
    if (!Number.isFinite(state.x)) state.x = 0;
    if (!Number.isFinite(state.y)) state.y = 0;
    if (!Number.isFinite(state.z)) state.z = 0;
    if (!Number.isFinite(state.heading)) state.heading = 0;
    if (!Number.isFinite(state.forwardSpeed)) state.forwardSpeed = 0;
    if (!Number.isFinite(state.lateralSpeed)) state.lateralSpeed = 0;
    if (!Number.isFinite(state.speed)) state.speed = 0;
    if (!Number.isFinite(state.steerAngle)) state.steerAngle = 0;
    if (!Number.isFinite(state.steerInput)) state.steerInput = 0;
    if (!Number.isFinite(state.angularVelocity)) state.angularVelocity = 0;
  }
}
