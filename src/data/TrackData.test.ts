import { describe, expect, it } from 'vitest';
import { parseTrackData, TrackData } from './TrackData';

describe('parseTrackData', () => {
  const validData: TrackData = {
    id: 'coastal-highway',
    displayName: 'Coastal City Highway',
    lengthMeters: 2500,
    laps: 3,
    controlPoints: [
      { x: 0, y: 0, z: 0, width: 14 },
      { x: 100, y: 0, z: 0, width: 14 },
      { x: 100, y: 0, z: 100, width: 14 },
      { x: 0, y: 0, z: 100, width: 14 },
    ],
    checkpointCount: 12,
    scenery: 'assets/tracks/coastal-highway/model/track-coastal-highway.glb',
    timeOfDayStart: 16.5,
  };

  it('validates and returns valid track data', () => {
    const parsed = parseTrackData(validData);
    expect(parsed.id).toBe('coastal-highway');
    expect(parsed.displayName).toBe('Coastal City Highway');
    expect(parsed.lengthMeters).toBe(2500);
    expect(parsed.laps).toBe(3);
    expect(parsed.controlPoints).toHaveLength(4);
    expect(parsed.checkpointCount).toBe(12);
    expect(parsed.timeOfDayStart).toBe(16.5);
  });

  it('throws when json is null or not an object', () => {
    expect(() => parseTrackData(null)).toThrow('TrackData must be a non-null object');
    expect(() => parseTrackData('bad string')).toThrow('TrackData must be a non-null object');
  });

  it('throws on missing or empty string fields', () => {
    expect(() => parseTrackData({ ...validData, id: '' })).toThrow(
      'TrackData.id must be a non-empty string',
    );
    expect(() => parseTrackData({ ...validData, displayName: '   ' })).toThrow(
      'TrackData.displayName must be a non-empty string',
    );
  });

  it('throws on invalid numeric fields', () => {
    expect(() => parseTrackData({ ...validData, lengthMeters: -10 })).toThrow(
      'TrackData.lengthMeters must be a positive finite number',
    );
    expect(() => parseTrackData({ ...validData, laps: 0 })).toThrow(
      'TrackData.laps must be a positive integer',
    );
    expect(() => parseTrackData({ ...validData, checkpointCount: 2.5 })).toThrow(
      'TrackData.checkpointCount must be a positive integer',
    );
    expect(() => parseTrackData({ ...validData, timeOfDayStart: 25 })).toThrow(
      'TrackData.timeOfDayStart must be a number between 0 and 24',
    );
    expect(() => parseTrackData({ ...validData, timeOfDayStart: -1 })).toThrow(
      'TrackData.timeOfDayStart must be a number between 0 and 24',
    );
  });

  it('throws on insufficient or invalid control points', () => {
    expect(() => parseTrackData({ ...validData, controlPoints: [] })).toThrow(
      'TrackData.controlPoints must be an array of at least 3 points',
    );
    expect(() =>
      parseTrackData({
        ...validData,
        controlPoints: [
          { x: 0, y: 0, z: 0, width: 14 },
          { x: 10, y: 0, z: 0, width: 14 },
        ],
      }),
    ).toThrow('TrackData.controlPoints must be an array of at least 3 points');

    expect(() =>
      parseTrackData({
        ...validData,
        controlPoints: [
          { x: 0, y: 0, z: 0, width: 14 },
          { x: 10, y: 0, z: 0, width: 14 },
          { x: NaN, y: 0, z: 0, width: 14 },
        ],
      }),
    ).toThrow('TrackData.controlPoints[2].x must be a finite number');

    expect(() =>
      parseTrackData({
        ...validData,
        controlPoints: [
          { x: 0, y: 0, z: 0, width: 14 },
          { x: 10, y: 0, z: 0, width: 14 },
          { x: 20, y: 0, z: 0, width: -2 },
        ],
      }),
    ).toThrow('TrackData.controlPoints[2].width must be a positive finite number');
  });
});
