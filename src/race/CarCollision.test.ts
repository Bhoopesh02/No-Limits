import { describe, expect, it } from 'vitest';
import {
  CAR_COLLISION_DIAMETER,
  CarCollision,
  CollidableVehicle,
  MIN_SPEED_AFTER_COLLISION,
} from './CarCollision';

describe('CarCollision', () => {
  it('separates overlapping cars so distance is at least collision diameter', () => {
    // Two cars overlapping along X: car A at 0, car B at 1.0 (overlap = 2.2 - 1.0 = 1.2m)
    const carA: CollidableVehicle = {
      x: 0,
      z: 0,
      heading: 0,
      forwardSpeed: 20,
      speed: 20,
    };
    const carB: CollidableVehicle = {
      x: 1.0,
      z: 0,
      heading: 0,
      forwardSpeed: 20,
      speed: 20,
    };

    const contacts = CarCollision.resolvePairs([carA, carB]);
    expect(contacts).toBe(1);

    const distAfter = Math.hypot(carB.x - carA.x, carB.z - carA.z);
    expect(distAfter).toBeGreaterThanOrEqual(CAR_COLLISION_DIAMETER - 1e-4);
  });

  it('slows down the rear car with bounded speed loss and never drops below minimum speed', () => {
    // Car A is directly behind Car B along forward direction (-Z):
    // Car A is at z = 0 (heading 0 -> forward is -Z)
    // Car B is at z = -1.5 (in front of A, overlap = 2.2 - 1.5 = 0.7m)
    const rearCar: CollidableVehicle = {
      x: 0,
      z: 0,
      heading: 0,
      forwardSpeed: 30,
      speed: 30,
    };
    const frontCar: CollidableVehicle = {
      x: 0,
      z: -1.5,
      heading: 0,
      forwardSpeed: 20,
      speed: 20,
    };

    CarCollision.resolvePairs([rearCar, frontCar]);

    // Front car forward speed unchanged
    expect(frontCar.forwardSpeed).toBe(20);

    // Rear car loses bounded speed
    expect(rearCar.forwardSpeed).toBeLessThan(30);
    expect(rearCar.forwardSpeed).toBeGreaterThan(25); // Bounded loss (max 3m/s or 15%)
    expect(rearCar.speed).toBeCloseTo(rearCar.forwardSpeed, 4);
  });

  it('never reduces speed below MIN_SPEED_AFTER_COLLISION even at slow speeds', () => {
    const rearCar: CollidableVehicle = {
      x: 0,
      z: 0,
      heading: 0,
      forwardSpeed: 2.2, // Barely above minimum
      speed: 2.2,
    };
    const frontCar: CollidableVehicle = {
      x: 0,
      z: -1.0,
      heading: 0,
      forwardSpeed: 2.0,
      speed: 2.0,
    };

    CarCollision.resolvePairs([rearCar, frontCar]);
    expect(rearCar.forwardSpeed).toBeGreaterThanOrEqual(MIN_SPEED_AFTER_COLLISION);
    expect(rearCar.speed).toBeGreaterThanOrEqual(MIN_SPEED_AFTER_COLLISION);
  });

  it('is completely deterministic across multiple runs', () => {
    const cars1 = [
      { x: 0, z: 0, heading: 0.1, forwardSpeed: 20, speed: 20 },
      { x: 0.5, z: -1.2, heading: 0.2, forwardSpeed: 25, speed: 25 },
      { x: -0.8, z: 1.0, heading: -0.1, forwardSpeed: 18, speed: 18 },
    ];
    const cars2 = [
      { x: 0, z: 0, heading: 0.1, forwardSpeed: 20, speed: 20 },
      { x: 0.5, z: -1.2, heading: 0.2, forwardSpeed: 25, speed: 25 },
      { x: -0.8, z: 1.0, heading: -0.1, forwardSpeed: 18, speed: 18 },
    ];

    CarCollision.resolvePairs(cars1);
    CarCollision.resolvePairs(cars2);

    expect(cars1).toEqual(cars2);
  });
});
