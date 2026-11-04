/**
 * Minimal read-only state required by AI drivers to make vehicle steering,
 * speed, and obstacle avoidance decisions.
 * Structurally satisfied by VehicleState without circular imports.
 */
export interface AiVehicleReadout {
  readonly x: number;
  readonly z: number;
  readonly heading: number;
  readonly speed: number;
  readonly lateralSpeed: number;
}
