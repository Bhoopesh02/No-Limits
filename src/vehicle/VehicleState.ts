/**
 * Vehicle coordinate conventions:
 * - Units: meters for position, meters/second (m/s) for speed, radians for angles, seconds for time.
 * - Right-handed Cartesian world coordinates with Y pointing UP (Y = 0 is road/ground plane).
 * - X axis points RIGHT (East).
 * - Z axis points BACKWARD/SOUTH, so -Z points FORWARD/NORTH (Three.js standard forward convention).
 * - Heading: rotation in radians around the vertical Y axis:
 *   - heading = 0 rad: facing forward along the -Z axis.
 *   - heading = +PI/2 rad (+90 deg): facing left along the -X axis.
 *   - heading = -PI/2 rad (-90 deg): facing right along the +X axis.
 *   - heading = PI or -PI rad: facing backward along the +Z axis.
 * - Local vehicle frame:
 *   - forward vector in world: fx = -sin(heading), fz = -cos(heading)
 *   - right (lateral) vector in world: rx = cos(heading), rz = -sin(heading)
 * - World velocity from forward and lateral speeds:
 *   - vx = fx * forwardSpeed + rx * lateralSpeed
 *   - vz = fz * forwardSpeed + rz * lateralSpeed
 */
export interface VehicleState {
  x: number;
  y: number;
  z: number;
  heading: number; // radians around Y
  speed: number; // total planar speed in m/s = hypot(forwardSpeed, lateralSpeed)
  forwardSpeed: number; // m/s forward velocity along car heading
  lateralSpeed: number; // m/s sideways velocity perpendicular to car heading (+right, -left)
  steerAngle: number; // front wheel steering angle in radians (+right, -left)
  nitroAmount: number; // nitro gauge charge from 0.0 to 1.0
  nitroActiveTime: number; // seconds remaining for current nitro burst
  nitroCooldownTimer: number; // seconds remaining for cooldown after nitro depletion
  isDrifting: boolean; // whether car is currently exceeding grip limit and drifting
  driftTime: number; // duration of current continuous drift in seconds
  driftScore: number; // accumulated drift points in current drift
  driftMultiplier: number; // current drift multiplier (1.0 + time held)
}

export function createVehicleState(x = 0, y = 0, z = 0, heading = 0, speed = 0): VehicleState {
  return {
    x,
    y,
    z,
    heading,
    speed,
    forwardSpeed: speed,
    lateralSpeed: 0,
    steerAngle: 0,
    nitroAmount: 1.0, // starts full
    nitroActiveTime: 0,
    nitroCooldownTimer: 0,
    isDrifting: false,
    driftTime: 0,
    driftScore: 0,
    driftMultiplier: 1.0,
  };
}

/**
 * Non-allocating in-place copy helper for render interpolation and state buffers.
 */
export function copyVehicleState(source: VehicleState, target: VehicleState): void {
  target.x = source.x;
  target.y = source.y;
  target.z = source.z;
  target.heading = source.heading;
  target.speed = source.speed;
  target.forwardSpeed = source.forwardSpeed;
  target.lateralSpeed = source.lateralSpeed;
  target.steerAngle = source.steerAngle;
  target.nitroAmount = source.nitroAmount;
  target.nitroActiveTime = source.nitroActiveTime;
  target.nitroCooldownTimer = source.nitroCooldownTimer;
  target.isDrifting = source.isDrifting;
  target.driftTime = source.driftTime;
  target.driftScore = source.driftScore;
  target.driftMultiplier = source.driftMultiplier;
}
