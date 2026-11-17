import type { TrackSample, TrackSampler } from '../data/TrackSampler';

export const GRID_TOTAL_SLOTS = 6;
export const GRID_ROW_SPACING_METERS = 8.0;
export const GRID_LATERAL_OFFSET_METERS = 3.0;
export const GRID_START_LINE_OFFSET_METERS = 8.0;
export const GRID_PLAYER_SLOT_INDEX = 5; // Default last slot when 6 slots are used

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
 * Builds starting grid slots in 2 staggered columns ahead of the start line.
 * Pole (slot 0) is placed furthest ahead.
 * The player takes the last slot (closest to the start line).
 * Works for any totalSlots (e.g. 4, 5, or 6 racers).
 * No car starts past the first checkpoint.
 */
export function buildGridLayout(
  track: TrackSampler,
  totalSlots = GRID_TOTAL_SLOTS,
): readonly GridSlot[] {
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

  const totalRows = Math.ceil(totalSlots / 2);
  const playerSlotIndex = totalSlots - 1;

  for (let index = 0; index < totalSlots; index++) {
    const row = Math.floor(index / 2);
    const col = index % 2; // 0 = left, 1 = right

    // Row 0 is furthest ahead (pole), last row is closest to start line
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
      isPlayer: index === playerSlotIndex,
    });
  }

  return slots;
}
