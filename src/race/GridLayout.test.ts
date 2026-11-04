import { describe, expect, it } from 'vitest';
import trackJson from '../../public/assets/tracks/coastal-highway/data/track-coastal-highway.json';
import { buildGridLayout, GRID_PLAYER_SLOT_INDEX, GRID_TOTAL_SLOTS } from './GridLayout';
import { Spline } from './Spline';

describe('GridLayout', () => {
  const spline = new Spline(trackJson.controlPoints, 1.0);
  const slots = buildGridLayout(spline);

  it('generates exactly 6 slots with player assigned to the last slot', () => {
    expect(slots.length).toBe(GRID_TOTAL_SLOTS);
    expect(slots[GRID_PLAYER_SLOT_INDEX].isPlayer).toBe(true);

    for (let i = 0; i < GRID_TOTAL_SLOTS; i++) {
      if (i !== GRID_PLAYER_SLOT_INDEX) {
        expect(slots[i].isPlayer).toBe(false);
      }
    }
  });

  it('places pole furthest ahead and subsequent rows behind in order', () => {
    // Pole (slot 0 and 1 in row 0) should have greatest distance ahead
    expect(slots[0].distance).toBeGreaterThan(slots[2].distance);
    expect(slots[2].distance).toBeGreaterThan(slots[4].distance);

    // Player (slot 5, row 2) is closest to the start line
    expect(slots[GRID_PLAYER_SLOT_INDEX].distance).toBeLessThan(slots[0].distance);
    expect(slots[GRID_PLAYER_SLOT_INDEX].distance).toBeLessThan(slots[2].distance);
  });

  it('ensures no car overlaps with another slot (at least 5m center-to-center distance)', () => {
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const dx = slots[i].x - slots[j].x;
        const dy = slots[i].y - slots[j].y;
        const dz = slots[i].z - slots[j].z;
        const dist = Math.hypot(dx, dy, dz);
        expect(dist, `Slots ${i} and ${j} overlap (distance ${dist}m)`).toBeGreaterThan(5.0);
      }
    }
  });

  it('ensures all slots are ahead of start line and none start past the first checkpoint', () => {
    const firstCheckpointDist = spline.length / trackJson.checkpointCount; // ~154.8m

    for (const slot of slots) {
      expect(slot.distance).toBeGreaterThan(0);
      expect(slot.distance).toBeLessThan(firstCheckpointDist);
      expect(Number.isNaN(slot.x)).toBe(false);
      expect(Number.isNaN(slot.z)).toBe(false);
      expect(Number.isNaN(slot.heading)).toBe(false);
    }
  });
});
