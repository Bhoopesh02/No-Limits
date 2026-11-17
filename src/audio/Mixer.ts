import { clamp } from '../core/clamp';

export interface MixerOptions {
  readonly initialMaster?: number;
  readonly initialSfx?: number;
  readonly initialMusic?: number;
  readonly initialEngine?: number;
}

/**
 * Manages audio submixes and gain nodes for master, SFX, music, and vehicle engine audio.
 */
export class Mixer {
  private readonly ctx: AudioContext;
  private readonly masterGain: GainNode;
  private readonly sfxGain: GainNode;
  private readonly musicGain: GainNode;
  private readonly engineGain: GainNode;

  private masterVolume = 80;
  private sfxVolume = 90;
  private musicVolume = 75;
  private engineVolume = 85;
  private muted = false;

  constructor(ctx: AudioContext, options: MixerOptions = {}) {
    this.ctx = ctx;

    this.masterGain = ctx.createGain();
    this.sfxGain = ctx.createGain();
    this.musicGain = ctx.createGain();
    this.engineGain = ctx.createGain();

    // Routing graph
    this.engineGain.connect(this.sfxGain);
    this.sfxGain.connect(this.masterGain);
    this.musicGain.connect(this.masterGain);
    this.masterGain.connect(ctx.destination);

    if (options.initialMaster !== undefined) this.masterVolume = clamp(options.initialMaster, 0, 100);
    if (options.initialSfx !== undefined) this.sfxVolume = clamp(options.initialSfx, 0, 100);
    if (options.initialMusic !== undefined) this.musicVolume = clamp(options.initialMusic, 0, 100);
    if (options.initialEngine !== undefined) this.engineVolume = clamp(options.initialEngine, 0, 100);

    this.applyAllGains(0);
  }

  public getMasterGainNode(): GainNode {
    return this.masterGain;
  }

  public getSfxGainNode(): GainNode {
    return this.sfxGain;
  }

  public getMusicGainNode(): GainNode {
    return this.musicGain;
  }

  public getEngineGainNode(): GainNode {
    return this.engineGain;
  }

  public setMasterVolume(val: number, rampTime = 0.05): void {
    this.masterVolume = clamp(val, 0, 100);
    if (!this.muted) {
      this.rampGain(this.masterGain, this.toPerceivedGain(this.masterVolume), rampTime);
    }
  }

  public setSfxVolume(val: number, rampTime = 0.05): void {
    this.sfxVolume = clamp(val, 0, 100);
    this.rampGain(this.sfxGain, this.toPerceivedGain(this.sfxVolume), rampTime);
  }

  public setMusicVolume(val: number, rampTime = 0.05): void {
    this.musicVolume = clamp(val, 0, 100);
    this.rampGain(this.musicGain, this.toPerceivedGain(this.musicVolume), rampTime);
  }

  public setEngineVolume(val: number, rampTime = 0.05): void {
    this.engineVolume = clamp(val, 0, 100);
    this.rampGain(this.engineGain, this.toPerceivedGain(this.engineVolume), rampTime);
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  public getEngineVolume(): number {
    return this.engineVolume;
  }

  public mute(rampTime = 0.05): void {
    if (this.muted) return;
    this.muted = true;
    this.rampGain(this.masterGain, 0, rampTime);
  }

  public unmute(rampTime = 0.05): void {
    if (!this.muted) return;
    this.muted = false;
    this.rampGain(this.masterGain, this.toPerceivedGain(this.masterVolume), rampTime);
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public dispose(): void {
    try {
      this.engineGain.disconnect();
      this.sfxGain.disconnect();
      this.musicGain.disconnect();
      this.masterGain.disconnect();
    } catch {
      // Ignore disconnection errors during cleanup
    }
  }

  private applyAllGains(rampTime: number): void {
    const masterTarget = this.muted ? 0 : this.toPerceivedGain(this.masterVolume);
    this.rampGain(this.masterGain, masterTarget, rampTime);
    this.rampGain(this.sfxGain, this.toPerceivedGain(this.sfxVolume), rampTime);
    this.rampGain(this.musicGain, this.toPerceivedGain(this.musicVolume), rampTime);
    this.rampGain(this.engineGain, this.toPerceivedGain(this.engineVolume), rampTime);
  }

  /**
   * Translates 0..100 linear slider value to perceived acoustic gain (squared curve).
   */
  private toPerceivedGain(sliderValue: number): number {
    const norm = clamp(sliderValue / 100, 0, 1);
    return norm * norm;
  }

  private rampGain(gainNode: GainNode, target: number, rampTime: number): void {
    const param = gainNode.gain;
    if (rampTime <= 0 || typeof param.setTargetAtTime !== 'function') {
      param.value = target;
      return;
    }
    const now = this.ctx.currentTime || 0;
    try {
      param.cancelScheduledValues(now);
      param.setTargetAtTime(target, now, rampTime);
    } catch {
      param.value = target;
    }
  }
}
