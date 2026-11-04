import type { TrackSample, TrackSampler } from '../data/TrackSampler';

export const GRID_TOTAL_SLOTS = 6;
export const GRID_ROW_SPACING_METERS = 8.0;
export const GRID_LATERAL_OFFSET_METERS = 3.0;
export const GRID_START_LINE_OFFSET_METERS = 8.0;
export const GRID_PLAYER_SLOT_INDEX = 5; // Last slot, closest to start line

export interface GridSlot {
  readonly index: number;
  readonly row: number;
  readonly column: number; // 0 = left (-3m), 1 = right (+3m)
  readonly distance: number;
  readonly lateralOffset: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly heading: number;
  readonly isPlayer: boolean;
}

/**
 * Builds 6 starting grid slots in 2 staggered columns ahead of the start line.
 * Pole (slot 0) is placed furthest ahead.
 * The player takes slot 5 (last slot, closest to the start line).
 * No car starts past the first checkpoint.
 */
export function buildGridLayout(track: TrackSampler): readonly GridSlot[] {
  const slots: GridSlot[] = [];
  const tempSample: TrackSample = {
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

  const totalRows = Math.ceil(GRID_TOTAL_SLOTS / 2); // 3 rows (0, 1, 2)

  for (let index = 0; index < GRID_TOTAL_SLOTS; index++) {
    const row = Math.floor(index / 2);
    const col = index % 2; // 0 = left, 1 = right

    // Row 0 is furthest ahead (pole), row 2 is closest to start line
    const distanceAhead =
      GRID_START_LINE_OFFSET_METERS + (totalRows - 1 - row) * GRID_ROW_SPACING_METERS;
    const distance = track.wrap(distanceAhead);

    // Column 0 is left (-GRID_LATERAL_OFFSET_METERS), column 1 is right (+GRID_LATERAL_OFFSET_METERS)
    const lateralOffset = col === 0 ? -GRID_LATERAL_OFFSET_METERS : GRID_LATERAL_OFFSET_METERS;

    track.sample(distance, tempSample);

    // Heading aligned along track tangent: in Three.js, -Z is heading = 0
    const heading = Math.atan2(-tempSample.tangentX, -tempSample.tangentZ);

    // Position offset perpendicular to tangent along unit normal
    const x = tempSample.x + tempSample.normalX * lateralOffset;
    const y = tempSample.y;
    const z = tempSample.z + tempSample.normalZ * lateralOffset;

    slots.push({
      index,
      row,
      column: col,
      distance,
      lateralOffset,
      x,
      y,
      z,
      heading,
      isPlayer: index === GRID_PLAYER_SLOT_INDEX,
    });
  }

  return slots;
}
