import { beforeEach, describe, expect, it } from 'vitest';
import { CarData, DEFAULT_CAR_KAZE } from '../data/CarData';
import { createInputState, InputState } from '../data/InputState';
import { VehicleModel } from './VehicleModel';
import { createVehicleState, VehicleState } from './VehicleState';

describe('VehicleModel', () => {
  let state: VehicleState;
  let input: InputState;
  const carData: CarData = DEFAULT_CAR_KAZE;
  const dt = 1 / 60; // 60 Hz fixed timestep

  beforeEach(() => {
    state = createVehicleState();
    input = createInputState();
  });

  it('accelerates from 0 to 100 km/h within 10% of the 4.1s target and reaches top speed', () => {
    input.throttle = 1.0;
    const target100Kmh = 100 / 3.6; // ~27.778 m/s
    let timeTo100 = 0;

    // Simulate for 60 seconds
    for (let i = 0; i < 60 * 60; i++) {
      VehicleModel.step(state, input, carData, dt);
      if (state.forwardSpeed >= target100Kmh && timeTo100 === 0) {
        timeTo100 = (i + 1) * dt;
      }
      expect(state.forwardSpeed).toBeLessThanOrEqual(carData.topSpeed + 0.001);
    }

    // 4.1s target with 10% tolerance (3.69s to 4.51s)
    expect(timeTo100).toBeGreaterThanOrEqual(4.1 * 0.9);
    expect(timeTo100).toBeLessThanOrEqual(4.1 * 1.1);

    // Reaches within 0.1% of top speed (290 km/h / 3.6 ≈ 80.56 m/s) and never exceeds without nitro
    expect(state.forwardSpeed).toBeCloseTo(carData.topSpeed, 1);
    expect(state.forwardSpeed).toBeLessThanOrEqual(carData.topSpeed);
  });

  it('stops the car with brake from speed and does not reverse until speed <= 1 m/s', () => {
    state.forwardSpeed = 50.0;
    state.speed = 50.0;
    input.brake = 1.0;

    // While speed > 1 m/s, car must decelerate and not reverse
    while (state.forwardSpeed > 1.0) {
      VehicleModel.step(state, input, carData, dt);
      if (state.forwardSpeed > 1.0) {
        expect(state.forwardSpeed).toBeGreaterThan(0);
        expect(state.isReversing).toBe(false);
      }
    }

    // Now speed <= 1 m/s. Continuing to hold brake must now accelerate backward in reverse
    expect(state.forwardSpeed).toBeLessThanOrEqual(1.0);

    for (let i = 0; i < 60; i++) {
      VehicleModel.step(state, input, carData, dt);
    }

    expect(state.forwardSpeed).toBeLessThan(0);
    expect(state.isReversing).toBe(true);
  });

  it('reaches reverseTopSpeed and never exceeds it when holding brake at standstill', () => {
    state.forwardSpeed = 0;
    state.speed = 0;
    input.brake = 1.0;
    input.throttle = 0;

    // Hold brake at standstill for 5 seconds (300 steps)
    for (let i = 0; i < 300; i++) {
      VehicleModel.step(state, input, carData, dt);
      expect(state.forwardSpeed).toBeLessThanOrEqual(0);
      expect(state.forwardSpeed).toBeGreaterThanOrEqual(-carData.reverseTopSpeed);
      expect(state.isReversing).toBe(true);
    }

    // Must reach reverse top speed (12 m/s) and never exceed it
    expect(state.forwardSpeed).toBeCloseTo(-carData.reverseTopSpeed, 1);
    expect(Math.abs(state.forwardSpeed)).toBeLessThanOrEqual(carData.reverseTopSpeed);
  });

  it('decelerates with throttle while reversing, crosses zero, then goes forward', () => {
    // Start car moving backward at reverse top speed
    state.forwardSpeed = -carData.reverseTopSpeed;
    state.speed = -carData.reverseTopSpeed;
    state.isReversing = true;

    input.throttle = 1.0;
    input.brake = 0;

    let crossedZero = false;
    let timeToCrossZero = 0;

    // Step for 4 seconds
    for (let i = 0; i < 240; i++) {
      const prevSpeed = state.forwardSpeed;
      VehicleModel.step(state, input, carData, dt);

      // Must decelerate towards zero (forwardSpeed increases)
      if (!crossedZero) {
        expect(state.forwardSpeed).toBeGreaterThan(prevSpeed);
        if (state.forwardSpeed >= 0) {
          crossedZero = true;
          timeToCrossZero = (i + 1) * dt;
        }
      }
    }

    expect(crossedZero).toBe(true);
    expect(timeToCrossZero).toBeGreaterThan(0);
    expect(state.forwardSpeed).toBeGreaterThan(10.0);
    expect(state.isReversing).toBe(false);
  });

  it('inverts steering direction correctly when in reverse', () => {
    // 1. Moving forward: steer right (steer = 1.0)
    const forwardCar = createVehicleState(0, 0, 0, 0, 20.0);
    const steerRightInput = createInputState();
    steerRightInput.steer = 1.0;
    steerRightInput.throttle = 0.5;

    for (let i = 0; i < 30; i++) {
      VehicleModel.step(forwardCar, steerRightInput, carData, dt);
    }
    const forwardHeadingDelta = forwardCar.heading;

    // 2. Moving backward (reverse): steer right (steer = 1.0)
    const reverseCar = createVehicleState(0, 0, 0, 0, -carData.reverseTopSpeed);
    const reverseSteerInput = createInputState();
    reverseSteerInput.steer = 1.0;
    reverseSteerInput.brake = 1.0; // keep in reverse

    for (let i = 0; i < 30; i++) {
      VehicleModel.step(reverseCar, reverseSteerInput, carData, dt);
    }
    const reverseHeadingDelta = reverseCar.heading;

    // Turning steering wheel right when reversing turns chassis in the opposite direction
    expect(Math.sign(reverseHeadingDelta)).toBe(-Math.sign(forwardHeadingDelta));
  });

  it('blocks nitro activation and keeps drift score unchanged while reversing', () => {
    state.forwardSpeed = -carData.reverseTopSpeed;
    state.speed = -carData.reverseTopSpeed;
    state.isReversing = true;
    state.nitroAmount = 1.0;
    state.lateralSpeed = 5.0; // high lateral slip
    state.driftScore = 0;

    input.nitro = true;
    input.steer = 1.0;
    input.brake = 1.0;

    for (let i = 0; i < 60; i++) {
      VehicleModel.step(state, input, carData, dt);
      // Nitro must remain inactive
      expect(state.nitroActiveTime).toBe(0);
      // Drift score must remain 0
      expect(state.driftScore).toBe(0);
      expect(state.isDrifting).toBe(false);
    }
  });

  it('shrinks steering angle with speed, turning tighter at low speed than high speed', () => {
    // Low speed steer test
    const lowSpeed = createVehicleState(0, 0, 0, 0, 10.0);
    const steerIn = createInputState();
    steerIn.steer = 1.0;

    // Run for 1.5 seconds so steering rack reaches target
    for (let i = 0; i < 90; i++) {
      lowSpeed.forwardSpeed = 10.0;
      VehicleModel.step(lowSpeed, steerIn, carData, dt);
    }
    const lowSpeedSteerAngle = Math.abs(lowSpeed.steerAngle);

    // High speed steer test
    const highSpeed = createVehicleState(0, 0, 0, 0, 75.0);
    for (let i = 0; i < 90; i++) {
      highSpeed.forwardSpeed = 75.0;
      VehicleModel.step(highSpeed, steerIn, carData, dt);
    }
    const highSpeedSteerAngle = Math.abs(highSpeed.steerAngle);

    expect(highSpeedSteerAngle).toBeLessThan(lowSpeedSteerAngle);
  });

  it('enters drift with handbrake plus steering at speed, lateral speed becomes non-zero then decays after release', () => {
    state.forwardSpeed = 35.0;
    state.speed = 35.0;
    input.throttle = 0.5;
    input.steer = 1.0;
    input.handbrake = true;

    // Apply handbrake + steer for 0.5s
    for (let i = 0; i < 30; i++) {
      VehicleModel.step(state, input, carData, dt);
    }

    expect(state.isDrifting).toBe(true);
    expect(Math.abs(state.lateralSpeed)).toBeGreaterThan(carData.driftEntrySlip);

    // Release handbrake and steering to straighten out
    input.handbrake = false;
    input.steer = 0;
    input.throttle = 1.0;

    for (let i = 0; i < 200; i++) {
      VehicleModel.step(state, input, carData, dt);
    }

    // Lateral velocity must decay to zero
    expect(state.lateralSpeed).toBe(0);
    expect(state.isDrifting).toBe(false);
  });

  it('accumulates drift score only while drifting, multiplier rises over time and resets when drift ends', () => {
    state.forwardSpeed = 40.0;
    // Steer right (0.8) kicks rear out leftwards (-lateralSpeed)
    state.lateralSpeed = -(carData.driftEntrySlip + 1.0);
    state.speed = Math.hypot(state.forwardSpeed, state.lateralSpeed);

    input.throttle = 1.0;
    input.steer = 0.8;
    input.handbrake = true; // sustain drift

    let prevScore = 0;
    // Step 2 seconds in drift
    for (let i = 0; i < 120; i++) {
      VehicleModel.step(state, input, carData, dt);
      expect(state.driftScore).toBeGreaterThanOrEqual(prevScore);
      prevScore = state.driftScore;
    }

    expect(state.isDrifting).toBe(true);
    expect(state.driftMultiplier).toBeGreaterThanOrEqual(2.0);
    expect(state.driftScore).toBeGreaterThan(0);

    // Release handbrake and steer to exit drift
    input.handbrake = false;
    input.steer = 0;
    input.throttle = 1.0;

    for (let i = 0; i < 240; i++) {
      VehicleModel.step(state, input, carData, dt);
    }

    expect(state.isDrifting).toBe(false);
    expect(state.driftMultiplier).toBe(1.0);
    expect(state.driftScore).toBe(0);
  });

  it('nitro fills during drift, cannot fire when empty or on cooldown, boosts above normal top speed, and stays in [0, 1]', () => {
    state.forwardSpeed = 30.0;
    state.speed = 30.0;
    state.nitroAmount = 0.0; // empty
    state.nitroActiveTime = 0;
    state.nitroCooldownTimer = 0;

    // 1. Cannot fire when empty
    input.nitro = true;
    VehicleModel.step(state, input, carData, dt);
    expect(state.nitroActiveTime).toBe(0);

    // 2. Fills while drifting
    input.nitro = false;
    input.handbrake = true;
    input.steer = 1.0;
    for (let i = 0; i < 60; i++) {
      VehicleModel.step(state, input, carData, dt);
    }
    expect(state.nitroAmount).toBeGreaterThan(0);
    expect(state.nitroAmount).toBeLessThanOrEqual(1.0);

    // Fill to 1.0
    state.nitroAmount = 1.0;
    state.forwardSpeed = carData.topSpeed; // already at top speed
    state.lateralSpeed = 0;
    input.handbrake = false;
    input.steer = 0;
    input.throttle = 1.0;
    input.nitro = true;

    // Fire nitro
    VehicleModel.step(state, input, carData, dt);
    expect(state.nitroActiveTime).toBeGreaterThan(0);

    // Advance while active: must boost beyond normal top speed
    for (let i = 0; i < 60; i++) {
      VehicleModel.step(state, input, carData, dt);
    }
    expect(state.forwardSpeed).toBeGreaterThan(carData.topSpeed);

    // Run until nitro fully expires
    for (let i = 0; i < 300; i++) {
      VehicleModel.step(state, input, carData, dt);
    }
    expect(state.nitroActiveTime).toBe(0);
    expect(state.nitroCooldownTimer).toBeGreaterThan(0);

    // During cooldown, cannot fire even if tank somehow has fuel
    state.nitroAmount = 1.0;
    input.nitro = true;
    VehicleModel.step(state, input, carData, dt);
    expect(state.nitroActiveTime).toBe(0);

    // Speed returns to normal top speed after boost ends
    for (let i = 0; i < 300; i++) {
      input.nitro = false;
      VehicleModel.step(state, input, carData, dt);
    }
    expect(state.forwardSpeed).toBeLessThanOrEqual(carData.topSpeed + 0.01);
  });

  it('guarantees bit-identical determinism over 1000 steps with identical inputs', () => {
    const stateA = createVehicleState();
    const stateB = createVehicleState();

    const sequence: InputState[] = [
      { steer: 0, throttle: 1, brake: 0, handbrake: false, nitro: false, pause: false },
      { steer: 0.6, throttle: 1, brake: 0, handbrake: true, nitro: false, pause: false },
      { steer: -0.4, throttle: 1, brake: 0, handbrake: false, nitro: true, pause: false },
      { steer: 0, throttle: 0, brake: 1, handbrake: false, nitro: false, pause: false },
    ];

    for (let i = 0; i < 1000; i++) {
      const stepInput = sequence[Math.floor(i / 250)];
      VehicleModel.step(stateA, stepInput, carData, dt);
      VehicleModel.step(stateB, stepInput, carData, dt);
    }

    expect(stateA.x).toBe(stateB.x);
    expect(stateA.y).toBe(stateB.y);
    expect(stateA.z).toBe(stateB.z);
    expect(stateA.heading).toBe(stateB.heading);
    expect(stateA.forwardSpeed).toBe(stateB.forwardSpeed);
    expect(stateA.lateralSpeed).toBe(stateB.lateralSpeed);
    expect(stateA.speed).toBe(stateB.speed);
    expect(stateA.steerAngle).toBe(stateB.steerAngle);
    expect(stateA.nitroAmount).toBe(stateB.nitroAmount);
    expect(stateA.driftScore).toBe(stateB.driftScore);
    expect(stateA.isReversing).toBe(stateB.isReversing);
  });

  it('maintains stability under extreme inputs (full steer at top speed for 10 s) with no NaN or Infinity', () => {
    state.forwardSpeed = carData.topSpeed;
    input.throttle = 1.0;
    input.steer = 1.0;
    input.handbrake = true;
    input.nitro = true;

    // Run for 10 seconds (600 steps)
    for (let i = 0; i < 600; i++) {
      VehicleModel.step(state, input, carData, dt);

      expect(Number.isFinite(state.x)).toBe(true);
      expect(Number.isFinite(state.y)).toBe(true);
      expect(Number.isFinite(state.z)).toBe(true);
      expect(Number.isFinite(state.heading)).toBe(true);
      expect(Number.isFinite(state.speed)).toBe(true);
      expect(Number.isFinite(state.forwardSpeed)).toBe(true);
      expect(Number.isFinite(state.lateralSpeed)).toBe(true);
      expect(Number.isFinite(state.steerAngle)).toBe(true);
    }
  });

  it('turns heading in the left direction when pressing left at speed, and opposite when pressing right', () => {
    // Car moves forward at 20 m/s with heading 0
    const leftCar = createVehicleState(0, 0, 0, 0, 20.0);
    const leftInput = createInputState();
    leftInput.steer = -1; // Left key on keyboard / dpad
    leftInput.throttle = 1.0;

    for (let i = 0; i < 30; i++) {
      VehicleModel.step(leftCar, leftInput, carData, dt);
    }
    // Positive heading turns the car left
    expect(leftCar.heading).toBeGreaterThan(0);

    const rightCar = createVehicleState(0, 0, 0, 0, 20.0);
    const rightInput = createInputState();
    rightInput.steer = 1; // Right key on keyboard / dpad
    rightInput.throttle = 1.0;

    for (let i = 0; i < 30; i++) {
      VehicleModel.step(rightCar, rightInput, carData, dt);
    }
    // Negative heading turns the car right (opposite direction)
    expect(rightCar.heading).toBeLessThan(0);
    expect(Math.sign(rightCar.heading)).toBe(-Math.sign(leftCar.heading));
  });

  it('returns steerInput to 0 on key release without overshooting', () => {
    // 1. Build up left steerInput
    const steerLeftInput = createInputState();
    steerLeftInput.steer = -1;
    for (let i = 0; i < 15; i++) {
      VehicleModel.step(state, steerLeftInput, carData, dt);
    }
    expect(state.steerInput).toBeGreaterThan(0.5);

    // 2. Release key (neutral steer = 0)
    const neutralInput = createInputState();
    let prevInput = state.steerInput;
    for (let i = 0; i < 60; i++) {
      VehicleModel.step(state, neutralInput, carData, dt);
      // Must not overshoot below 0
      expect(state.steerInput).toBeGreaterThanOrEqual(0);
      expect(state.steerInput).toBeLessThanOrEqual(prevInput);
      prevInput = state.steerInput;
    }
    expect(state.steerInput).toBe(0);

    // 3. Repeat for right steerInput (negative steerInput)
    const steerRightInput = createInputState();
    steerRightInput.steer = 1;
    for (let i = 0; i < 15; i++) {
      VehicleModel.step(state, steerRightInput, carData, dt);
    }
    expect(state.steerInput).toBeLessThan(-0.5);

    prevInput = state.steerInput;
    for (let i = 0; i < 60; i++) {
      VehicleModel.step(state, neutralInput, carData, dt);
      // Must not overshoot above 0
      expect(state.steerInput).toBeLessThanOrEqual(0);
      expect(state.steerInput).toBeGreaterThanOrEqual(prevInput);
      prevInput = state.steerInput;
    }
    expect(state.steerInput).toBe(0);
  });

  it('has smaller max wheel angle at 60 m/s than at 5 m/s', () => {
    const lowSpeedCar = createVehicleState(0, 0, 0, 0, 5.0);
    const highSpeedCar = createVehicleState(0, 0, 0, 0, 60.0);

    // Full left steer (analog to check instantaneous speed-dependent maxAngle directly)
    const fullSteer = createInputState();
    fullSteer.steer = -1;
    (fullSteer as { isAnalog?: boolean }).isAnalog = true;

    VehicleModel.step(lowSpeedCar, fullSteer, carData, dt);
    VehicleModel.step(highSpeedCar, fullSteer, carData, dt);

    expect(Math.abs(highSpeedCar.steerAngle)).toBeLessThan(Math.abs(lowSpeedCar.steerAngle));
    // At 60 m/s, maxAngle is clamped to minSteerAngle (5 deg ~ 0.0873 rad)
    expect(Math.abs(highSpeedCar.steerAngle)).toBeCloseTo(carData.minSteerAngle, 2);
    // At 5 m/s, maxAngle is close to maxSteerAngle (30 deg ~ 0.5236 rad)
    expect(Math.abs(lowSpeedCar.steerAngle)).toBeCloseTo(carData.maxSteerAngle, 1);
  });

  it('does not change heading when steering at speed 0', () => {
    state.forwardSpeed = 0;
    state.speed = 0;
    state.heading = 0;

    // Full left steer at standstill
    const leftInput = createInputState();
    leftInput.steer = -1;
    for (let i = 0; i < 60; i++) {
      VehicleModel.step(state, leftInput, carData, dt);
      expect(state.heading).toBe(0);
    }

    // Full right steer at standstill
    const rightInput = createInputState();
    rightInput.steer = 1;
    for (let i = 0; i < 60; i++) {
      VehicleModel.step(state, rightInput, carData, dt);
      expect(state.heading).toBe(0);
    }
  });

  it('produces deterministic bit-identical steering results for identical inputs', () => {
    const carA = createVehicleState(0, 0, 0, 0, 25.0);
    const carB = createVehicleState(0, 0, 0, 0, 25.0);

    const inputs: InputState[] = [
      { steer: -1, throttle: 1, brake: 0, handbrake: false, nitro: false, pause: false },
      { steer: 0, throttle: 1, brake: 0, handbrake: false, nitro: false, pause: false },
      { steer: 1, throttle: 0.5, brake: 0, handbrake: true, nitro: false, pause: false },
      { steer: 0, throttle: 0, brake: 1, handbrake: false, nitro: false, pause: false },
    ];

    for (let i = 0; i < 240; i++) {
      const stepInput = inputs[Math.floor(i / 60)];
      VehicleModel.step(carA, stepInput, carData, dt);
      VehicleModel.step(carB, stepInput, carData, dt);
    }

    expect(carA.heading).toBe(carB.heading);
    expect(carA.steerAngle).toBe(carB.steerAngle);
    expect(carA.steerInput).toBe(carB.steerInput);
    expect(carA.angularVelocity).toBe(carB.angularVelocity);
    expect(carA.forwardSpeed).toBe(carB.forwardSpeed);
    expect(carA.lateralSpeed).toBe(carB.lateralSpeed);
  });
});
