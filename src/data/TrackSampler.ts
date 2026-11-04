export interface TrackSample {
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

export function createEmptyTrackSample(): TrackSample {
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

/**
 * Minimal read-only interface describing track spline sampling capabilities required by AI systems.
 */
export interface TrackSampler {
  readonly totalLength: number;
  readonly closed: boolean;
  sample(distance: number, out: TrackSample): void;
  wrap(distance: number): number;
}
