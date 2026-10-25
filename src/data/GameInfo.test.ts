import { describe, expect, it } from 'vitest';
import { GameInfo } from './GameInfo';

describe('GameInfo', () => {
  it('defines the expected display name and metadata', () => {
    expect(GameInfo.displayName).toBe('No Limits');
    expect(GameInfo.shortName).toBe('NoLimits');
    expect(typeof GameInfo.version).toBe('string');
    expect(GameInfo.version.length).toBeGreaterThan(0);
    expect(typeof GameInfo.appId).toBe('string');
    expect(GameInfo.appId.length).toBeGreaterThan(0);
  });
});
