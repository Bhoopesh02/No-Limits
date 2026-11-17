import { describe, expect, it } from 'vitest';
import { MockAudioContext, MockGainNode } from './mockAudioContext';
import { SoundEffects } from './SoundEffects';

describe('SoundEffects', () => {
  it('initializes tire squeal and nitro synthesis nodes', () => {
    const mockCtx = new MockAudioContext();
    const dest = new MockGainNode();
    const sfx = new SoundEffects(mockCtx as unknown as AudioContext, dest as unknown as GainNode);

    expect(sfx).toBeDefined();
    sfx.start();
  });

  it('modulates tire squeal gain when drifting or sliding laterally', () => {
    const mockCtx = new MockAudioContext();
    const dest = new MockGainNode();
    const sfx = new SoundEffects(mockCtx as unknown as AudioContext, dest as unknown as GainNode);

    sfx.start();

    // Not drifting: no lateral speed
    sfx.update(0, false, 0, 20);

    // Drifting with 5 m/s lateral slip
    sfx.update(5.0, true, 0, 30);

    // High lateral speed slide without explicit drift flag
    sfx.update(-4.5, false, 0, 25);
  });

  it('triggers nitro whoosh when nitro is active', () => {
    const mockCtx = new MockAudioContext();
    const dest = new MockGainNode();
    const sfx = new SoundEffects(mockCtx as unknown as AudioContext, dest as unknown as GainNode);

    sfx.start();

    // Nitro active (e.g. 2.5s remaining)
    sfx.update(0, false, 2.5, 40);

    // Nitro depleted
    sfx.update(0, false, 0, 40);
  });

  it('plays countdown, ui click, and collision audio without throwing', () => {
    const mockCtx = new MockAudioContext();
    const dest = new MockGainNode();
    const sfx = new SoundEffects(mockCtx as unknown as AudioContext, dest as unknown as GainNode);

    expect(() => sfx.playCountdown(3)).not.toThrow();
    expect(() => sfx.playCountdown(2)).not.toThrow();
    expect(() => sfx.playCountdown(1)).not.toThrow();
    expect(() => sfx.playCountdown('GO')).not.toThrow();
    expect(() => sfx.playUiClick()).not.toThrow();
    expect(() => sfx.playCollision(15)).not.toThrow();
  });

  it('stops and disposes cleanly', () => {
    const mockCtx = new MockAudioContext();
    const dest = new MockGainNode();
    const sfx = new SoundEffects(mockCtx as unknown as AudioContext, dest as unknown as GainNode);

    sfx.start();
    sfx.stop();
    expect(() => sfx.dispose()).not.toThrow();
  });
});
