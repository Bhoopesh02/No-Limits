export interface PlanarVehiclePose {
  x: number;
  z: number;
  heading: number;
  forwardSpeed: number;
  lateralSpeed: number;
}

export interface TrackLimiter {
  resolve(pose: PlanarVehiclePose, dt: number): void;
}
