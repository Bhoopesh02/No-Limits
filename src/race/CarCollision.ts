/**
 * Soft car-to-car collision resolution for multi-car races.
 *
 * Rules:
 * - Each car is modeled as a bounding circle of radius CAR_COLLISION_RADIUS (1.1 m).
 * - Overlapping pairs are cleanly separated along their contact normal.
 * - The trailing car (hitting from behind) loses a small, bounded amount of speed.
 * - Speeds are never reduced below MIN_SPEED_AFTER_COLLISION to prevent cars from getting stuck.
 * - Deterministic, allocation-free, O(N^2) for up to 6 cars (15 checks per fixed step).
 */

/** Radius of the circular bounding volume around the vehicle center (meters). */
export const CAR_COLLISION_RADIUS = 1.1;

/** Center-to-center minimum contact distance threshold (2 * radius = 2.2 meters). */
export const CAR_COLLISION_DIAMETER = CAR_COLLISION_RADIUS * 2.0;
export const CAR_COLLISION_DIAMETER_SQ = CAR_COLLISION_DIAMETER * CAR_COLLISION_DIAMETER;

/** Minimum speed guaranteed after collision deceleration (m/s). */
export const MIN_SPEED_AFTER_COLLISION = 2.0;

/** Maximum speed loss applied in a single collision event (m/s). */
export const MAX_SPEED_LOSS_PER_HIT = 3.0;

/** Deceleration factor applied to the rear car (15% reduction of speed above minimum). */
export const REAR_CAR_SPEED_LOSS_RATIO = 0.15;

export interface CollidableVehicle {
  x: number;
  z: number;
  heading: number;
  forwardSpeed: number;
  speed: number;
}

export class CarCollision {
  /**
   * Resolves collisions among a list of vehicles in-place without allocations.
   *
   * @param vehicles Array of vehicle states to test and separate.
   * @returns Number of contact pairs resolved during this step.
   */
  public static resolvePairs(vehicles: readonly CollidableVehicle[]): number {
    let contactCount = 0;
    const n = vehicles.length;

    for (let i = 0; i < n; i++) {
      const vA = vehicles[i];
      for (let j = i + 1; j < n; j++) {
        const vB = vehicles[j];

        let dx = vB.x - vA.x;
        let dz = vB.z - vA.z;
        const distSq = dx * dx + dz * dz;

        if (distSq < CAR_COLLISION_DIAMETER_SQ) {
          contactCount++;
          let dist = Math.sqrt(distSq);

          // Handle exact center coincidence
          if (dist < 1e-4) {
            dist = 1e-4;
            dx = 1e-4;
            dz = 0;
          }

          const overlap = CAR_COLLISION_DIAMETER - dist;
          const nx = dx / dist;
          const nz = dz / dist;

          // 1. Positional separation (push each car apart by half overlap)
          const push = overlap * 0.5;
          vA.x -= nx * push;
          vA.z -= nz * push;
          vB.x += nx * push;
          vB.z += nz * push;

          // 2. Identify trailing car along car A's heading
          // Heading: in Three.js standard, forward is (-sin(h), -cos(h))
          const fxA = -Math.sin(vA.heading);
          const fzA = -Math.cos(vA.heading);
          const projA = dx * fxA + dz * fzA;

          // If projA > 0, car B is in front of A -> car A is trailing.
          // If projA < 0, car A is in front of B -> car B is trailing.
          const rearCar = projA >= 0 ? vA : vB;

          // 3. Remove bounded speed from the trailing car
          if (rearCar.forwardSpeed > MIN_SPEED_AFTER_COLLISION) {
            const speedAboveMin = rearCar.forwardSpeed - MIN_SPEED_AFTER_COLLISION;
            const speedLoss = Math.min(
              MAX_SPEED_LOSS_PER_HIT,
              speedAboveMin * REAR_CAR_SPEED_LOSS_RATIO,
            );
            rearCar.forwardSpeed -= speedLoss;
            rearCar.speed = Math.max(MIN_SPEED_AFTER_COLLISION, rearCar.speed - speedLoss);
          }
        }
      }
    }

    return contactCount;
  }
}
