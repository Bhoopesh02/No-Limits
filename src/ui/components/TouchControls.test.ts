import { describe, expect, it } from 'vitest';
import { isPointInBounds, shouldShowTouchControlsGiven } from './TouchControls';

describe('TouchControls pure logic', () => {
  describe('isPointInBounds', () => {
    const bounds = { left: 100, right: 200, top: 50, bottom: 150 };

    it('returns true when point is inside bounds', () => {
      expect(isPointInBounds(150, 100, bounds)).toBe(true);
    });

    it('returns true on exact boundary edges', () => {
      expect(isPointInBounds(100, 50, bounds)).toBe(true);
      expect(isPointInBounds(200, 150, bounds)).toBe(true);
      expect(isPointInBounds(100, 150, bounds)).toBe(true);
      expect(isPointInBounds(200, 50, bounds)).toBe(true);
    });

    it('returns false when point is outside bounds in any direction', () => {
      expect(isPointInBounds(99, 100, bounds)).toBe(false); // left
      expect(isPointInBounds(201, 100, bounds)).toBe(false); // right
      expect(isPointInBounds(150, 49, bounds)).toBe(false); // top
      expect(isPointInBounds(150, 151, bounds)).toBe(false); // bottom
    });
  });

  describe('shouldShowTouchControlsGiven', () => {
    it('returns true when ?touch=1 is present in URL search', () => {
      expect(shouldShowTouchControlsGiven('?touch=1', false)).toBe(true);
      expect(shouldShowTouchControlsGiven('?track=coastal&touch=1&debug=true', false)).toBe(true);
    });

    it('returns false when desktop/fine pointer and ?touch=1 is not set', () => {
      expect(shouldShowTouchControlsGiven('', false)).toBe(false);
      expect(shouldShowTouchControlsGiven('?touch=0', false)).toBe(false);
      expect(shouldShowTouchControlsGiven('?other=1', false)).toBe(false);
    });

    it('returns true when pointer is coarse (touch device) without query parameter', () => {
      expect(shouldShowTouchControlsGiven('', true)).toBe(true);
    });
  });
});
