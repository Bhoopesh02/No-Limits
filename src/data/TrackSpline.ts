export interface SplineSample {
  x: number;
  y: number;
  z: number;
  tangentX: number;
  tangentY: number;
  tangentZ: number;
  normalX: number;
  normalY: number;
  normalZ: number;
  width: number;
}

export interface SplineProjection {
  distance: number;
  lateralOffset: number;
  sample: SplineSample;
}

export function createEmptySplineSample(): SplineSample {
  return {
    x: 0,
    y: 0,
    z: 0,
    tangentX: 0,
    tangentY: 0,
    tangentZ: -1,
    normalX: 1,
    normalY: 0,
    normalZ: 0,
    width: 15,
  };
}

export function createEmptySplineProjection(): SplineProjection {
  return {
    distance: 0,
    lateralOffset: 0,
    sample: createEmptySplineSample(),
  };
}

export interface TrackSpline {
  readonly length: number;
  sample(distance: number, out: SplineSample): SplineSample;
  project(x: number, z: number, hint: number, out: SplineProjection): SplineProjection;
  wrap(distance: number): number;
}
