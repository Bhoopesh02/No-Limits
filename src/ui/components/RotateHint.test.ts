import { describe, expect, it } from 'vitest';
import { shouldShowRotateHintGiven } from './RotateHint';

describe('RotateHint pure logic', () => {
  it('returns false for desktop (non-touch and not forced)', () => {
    expect(
      shouldShowRotateHintGiven({
        isTouchForced: false,
        isCoarsePointer: false,
        isPortraitMedia: true,
        innerWidth: 400,
        innerHeight: 800,
      }),
    ).toBe(false);
  });

  it('returns true for touch devices in portrait orientation (by media query)', () => {
    expect(
      shouldShowRotateHintGiven({
        isTouchForced: false,
        isCoarsePointer: true,
        isPortraitMedia: true,
        innerWidth: 390,
        innerHeight: 844,
      }),
    ).toBe(true);
  });

  it('returns true for touch devices when window height > width even if media query is false', () => {
    expect(
      shouldShowRotateHintGiven({
        isTouchForced: false,
        isCoarsePointer: true,
        isPortraitMedia: false,
        innerWidth: 360,
        innerHeight: 800,
      }),
    ).toBe(true);
  });

  it('returns false for touch devices in landscape orientation', () => {
    expect(
      shouldShowRotateHintGiven({
        isTouchForced: false,
        isCoarsePointer: true,
        isPortraitMedia: false,
        innerWidth: 844,
        innerHeight: 390,
      }),
    ).toBe(false);
  });

  it('returns true for forced touch (?touch=1) when simulated in portrait', () => {
    expect(
      shouldShowRotateHintGiven({
        isTouchForced: true,
        isCoarsePointer: false,
        isPortraitMedia: false,
        innerWidth: 500,
        innerHeight: 900,
      }),
    ).toBe(true);
  });

  it('returns false for forced touch (?touch=1) when simulated in landscape', () => {
    expect(
      shouldShowRotateHintGiven({
        isTouchForced: true,
        isCoarsePointer: false,
        isPortraitMedia: false,
        innerWidth: 900,
        innerHeight: 500,
      }),
    ).toBe(false);
  });
});
