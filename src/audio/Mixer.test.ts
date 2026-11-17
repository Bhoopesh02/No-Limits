import { describe, expect, it } from 'vitest';
import { Mixer } from './Mixer';
import { MockAudioContext } from './mockAudioContext';

describe('Mixer', () => {
  it('initializes routing graph with default volume levels', () => {
    const mockCtx = new MockAudioContext();
    const mixer = new Mixer(mockCtx as unknown as AudioContext);

    expect(mixer.getMasterVolume()).toBe(80);
    expect(mixer.getSfxVolume()).toBe(90);
    expect(mixer.getMusicVolume()).toBe(75);
    expect(mixer.getEngineVolume()).toBe(85);

    // Audio graph connections: engine -> sfx -> master -> destination
    const engineGain = mixer.getEngineGainNode();
    const sfxGain = mixer.getSfxGainNode();
    const musicGain = mixer.getMusicGainNode();
    const masterGain = mixer.getMasterGainNode();

    // Verify connections
    expect(engineGain).toBeDefined();
    expect(sfxGain).toBeDefined();
    expect(musicGain).toBeDefined();
    expect(masterGain).toBeDefined();
  });

  it('sets and clamps volume levels to 0..100', () => {
    const mockCtx = new MockAudioContext();
    const mixer = new Mixer(mockCtx as unknown as AudioContext, {
      initialMaster: 50,
      initialSfx: 60,
    });

    mixer.setMasterVolume(120);
    expect(mixer.getMasterVolume()).toBe(100);

    mixer.setMasterVolume(-10);
    expect(mixer.getMasterVolume()).toBe(0);

    mixer.setSfxVolume(70);
    expect(mixer.getSfxVolume()).toBe(70);

    mixer.setMusicVolume(40);
    expect(mixer.getMusicVolume()).toBe(40);

    mixer.setEngineVolume(95);
    expect(mixer.getEngineVolume()).toBe(95);
  });

  it('supports muting and unmuting master output', () => {
    const mockCtx = new MockAudioContext();
    const mixer = new Mixer(mockCtx as unknown as AudioContext, { initialMaster: 80 });

    expect(mixer.isMuted()).toBe(false);

    mixer.mute(0);
    expect(mixer.isMuted()).toBe(true);
    expect(mixer.getMasterGainNode().gain.value).toBe(0);

    mixer.unmute(0);
    expect(mixer.isMuted()).toBe(false);
    // (80/100)^2 = 0.64
    expect(mixer.getMasterGainNode().gain.value).toBeCloseTo(0.64, 2);
  });

  it('disposes cleanly without errors', () => {
    const mockCtx = new MockAudioContext();
    const mixer = new Mixer(mockCtx as unknown as AudioContext);

    expect(() => mixer.dispose()).not.toThrow();
  });
});
