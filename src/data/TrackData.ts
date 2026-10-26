export interface TrackControlPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly width: number;
}

export interface TrackData {
  readonly id: string;
  readonly displayName: string;
  readonly lengthMeters: number;
  readonly laps: number;
  readonly controlPoints: readonly TrackControlPoint[];
  readonly checkpointCount: number;
  readonly scenery: string;
  readonly timeOfDayStart: number;
}

export function parseTrackData(json: unknown): TrackData {
  if (typeof json !== 'object' || json === null) {
    throw new Error('TrackData must be a non-null object');
  }

  const data = json as Record<string, unknown>;

  if (typeof data.id !== 'string' || data.id.trim() === '') {
    throw new Error('TrackData.id must be a non-empty string');
  }

  if (typeof data.displayName !== 'string' || data.displayName.trim() === '') {
    throw new Error('TrackData.displayName must be a non-empty string');
  }

  if (
    typeof data.lengthMeters !== 'number' ||
    !Number.isFinite(data.lengthMeters) ||
    data.lengthMeters <= 0
  ) {
    throw new Error('TrackData.lengthMeters must be a positive finite number');
  }

  if (typeof data.laps !== 'number' || !Number.isInteger(data.laps) || data.laps <= 0) {
    throw new Error('TrackData.laps must be a positive integer');
  }

  if (
    typeof data.checkpointCount !== 'number' ||
    !Number.isInteger(data.checkpointCount) ||
    data.checkpointCount <= 0
  ) {
    throw new Error('TrackData.checkpointCount must be a positive integer');
  }

  if (typeof data.scenery !== 'string') {
    throw new Error('TrackData.scenery must be a string');
  }

  if (
    typeof data.timeOfDayStart !== 'number' ||
    !Number.isFinite(data.timeOfDayStart) ||
    data.timeOfDayStart < 0 ||
    data.timeOfDayStart > 24
  ) {
    throw new Error('TrackData.timeOfDayStart must be a number between 0 and 24');
  }

  if (!Array.isArray(data.controlPoints) || data.controlPoints.length < 3) {
    throw new Error(
      'TrackData.controlPoints must be an array of at least 3 points for a closed loop',
    );
  }

  const validatedPoints: TrackControlPoint[] = [];

  for (let i = 0; i < data.controlPoints.length; i++) {
    const pt = data.controlPoints[i];
    if (typeof pt !== 'object' || pt === null) {
      throw new Error(`TrackData.controlPoints[${i}] must be a non-null object`);
    }

    const p = pt as Record<string, unknown>;

    if (typeof p.x !== 'number' || !Number.isFinite(p.x)) {
      throw new Error(`TrackData.controlPoints[${i}].x must be a finite number`);
    }
    if (typeof p.y !== 'number' || !Number.isFinite(p.y)) {
      throw new Error(`TrackData.controlPoints[${i}].y must be a finite number`);
    }
    if (typeof p.z !== 'number' || !Number.isFinite(p.z)) {
      throw new Error(`TrackData.controlPoints[${i}].z must be a finite number`);
    }
    if (typeof p.width !== 'number' || !Number.isFinite(p.width) || p.width <= 0) {
      throw new Error(`TrackData.controlPoints[${i}].width must be a positive finite number`);
    }

    validatedPoints.push({
      x: p.x,
      y: p.y,
      z: p.z,
      width: p.width,
    });
  }

  return {
    id: data.id,
    displayName: data.displayName,
    lengthMeters: data.lengthMeters,
    laps: data.laps,
    controlPoints: validatedPoints,
    checkpointCount: data.checkpointCount,
    scenery: data.scenery,
    timeOfDayStart: data.timeOfDayStart,
  };
}
