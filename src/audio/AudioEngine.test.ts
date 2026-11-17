import { describe, expect, it } from 'vitest';
import { AudioEngine } from './AudioEngine';
import { MockAudioContext } from './mockAudioContext';

describe('AudioEngine', () => {
  it('gracefully handles headless environments when AudioContext is absent', () => {
    // AudioEngine with no window.AudioContext provided
    const audio = new AudioEngine();

    expect(audio.isAudioSupported()).toBe(false);
    expect(audio.isAudioUnlocked()).toBe(false);
    expect(audio.getAudioContext()).toBeNull();
    expect(audio.getMixer()).toBeNull();
    expect(audio.getPlayerEngine()).toBeNull();

    // All public methods should safely no-op
    expect(async () => await audio.unlock()).not.toThrow();
    expect(() => audio.startPlayerEngine()).not.toThrow();
    expect(() => audio.stopPlayerEngine()).not.toThrow();
    expect(() => audio.updatePlayerEngine(20, 1.0, false, 0.016)).not.toThrow();
    expect(() =>
      audio.syncVolumes({ masterVolume: 80, sfxVolume: 90, musicVolume: 70 }),
    ).not.toThrow();
    expect(() => audio.setPaused(true)).not.toThrow();
    expect(() => audio.dispose()).not.toThrow();
  });

  it('initializes context, mixer, and player engine when context is provided', () => {
    const mockCtx = new MockAudioContext();
    const audio = new AudioEngine({
      audioContext: mockCtx as unknown as AudioContext,
      initialMaster: 85,
    });

    expect(audio.isAudioSupported()).toBe(true);
    expect(audio.getMixer()).toBeDefined();
    expect(audio.getPlayerEngine()).toBeDefined();
    expect(audio.getMixer()?.getMasterVolume()).toBe(85);
  });

  it('unlocks suspended context on user gesture', async () => {
    const mockCtx = new MockAudioContext();
    mockCtx.state = 'suspended';

    const audio = new AudioEngine({
      audioContext: mockCtx as unknown as AudioContext,
    });

    expect(audio.isAudioUnlocked()).toBe(false);

    const unlocked = await audio.unlock();
    expect(unlocked).toBe(true);
    expect(audio.isAudioUnlocked()).toBe(true);
    expect(mockCtx.state).toBe('running');
  });

  it('synchronizes volumes with user settings', () => {
    const mockCtx = new MockAudioContext();
    const audio = new AudioEngine({
      audioContext: mockCtx as unknown as AudioContext,
    });

    audio.syncVolumes({ masterVolume: 65, sfxVolume: 75, musicVolume: 50 });

    const mixer = audio.getMixer();
    expect(mixer?.getMasterVolume()).toBe(65);
    expect(mixer?.getSfxVolume()).toBe(75);
    expect(mixer?.getMusicVolume()).toBe(50);
  });

  it('mutes and restores on pause/unpause', () => {
    const mockCtx = new MockAudioContext();
    const audio = new AudioEngine({
      audioContext: mockCtx as unknown as AudioContext,
    });

    expect(audio.isAudioPaused()).toBe(false);
    audio.setPaused(true);
    expect(audio.isAudioPaused()).toBe(true);
    expect(audio.getMixer()?.isMuted()).toBe(true);

    audio.setPaused(false);
    expect(audio.isAudioPaused()).toBe(false);
    expect(audio.getMixer()?.isMuted()).toBe(false);
  });

  it('runs player engine methods and disposes cleanly', () => {
    const mockCtx = new MockAudioContext();
    const audio = new AudioEngine({
      audioContext: mockCtx as unknown as AudioContext,
    });

    audio.startPlayerEngine();
    audio.updatePlayerEngine(30, 0.8, false, 0.016);
    expect(audio.getPlayerEngine()?.getRpm()).toBeGreaterThan(850);

    audio.stopPlayerEngine();
    audio.dispose();
  });
});
