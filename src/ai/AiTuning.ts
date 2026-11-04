/**
 * Centralized AI tuning constants.
 * All units are standard SI (meters, seconds, radians, m/s, m/s^2).
 */

/** Nominal distance between precomputed racing line samples (meters). */
export const RACING_LINE_SAMPLE_STEP_METERS = 4.5;

/** Maximum lateral cornering acceleration allowed when computing apex speeds (m/s^2). */
export const RACING_LINE_MAX_LAT_ACCEL = 13.5;

/** Maximum braking deceleration assumed for racing line speed profile backwards pass (m/s^2). */
export const RACING_LINE_MAX_BRAKE_DECEL = 16.0;

/** Maximum forward acceleration assumed for racing line speed profile forward pass (m/s^2). */
export const RACING_LINE_MAX_DRIVE_ACCEL = 8.5;

/** Safe clearance kept from physical road edge (meters). */
export const RACING_LINE_ROAD_SAFETY_MARGIN = 2.0;

/** Minimum lookahead distance for pure pursuit steering at low speed (meters). */
export const AI_LOOKAHEAD_MIN_METERS = 8.0;

/** Speed-dependent lookahead gain factor (seconds: lookahead = min + speed * factor). */
export const AI_LOOKAHEAD_SPEED_FACTOR = 0.42;

/** Lateral acceleration comfort limit for AI driver braking threshold (m/s^2). */
export const AI_BRAKING_DECEL = 17.0;

/** Maximum target-speed jitter applied per driver variation (fraction, +/- 1.5%). */
export const AI_SPEED_JITTER_SCALE = 0.015;

/** Maximum lateral racing line offset jitter applied per driver variation (meters, +/- 0.6m). */
export const AI_LATERAL_JITTER_METERS = 0.6;

/** Brake point scaling range for driver variations (0.95 to 1.05). */
export const AI_BRAKE_POINT_SCALE_MIN = 0.95;
export const AI_BRAKE_POINT_SCALE_MAX = 1.05;

/** Update interval for driver jitter variation in seconds. */
export const AI_JITTER_UPDATE_INTERVAL_SECONDS = 1.0;

/** Maximum rubber-band speed scaling effect (+/- 8%). */
export const AI_RUBBER_BAND_MAX_SCALE = 0.08;

/** Distance range over which rubber-band scaling smoothly ramps (meters). */
export const AI_RUBBER_BAND_RANGE_METERS = 150.0;

/** Speed threshold below which AI car is considered stalled / stuck (m/s). */
export const AI_RECOVERY_SPEED_THRESHOLD = 3.0;

/** Continuous standstill duration before initiating recovery respawn (seconds). */
export const AI_RECOVERY_TIME_THRESHOLD = 3.0;

/** Forward speed given to AI car upon recovery respawn (m/s). */
export const AI_RECOVERY_RESPAWN_SPEED = 8.0;
