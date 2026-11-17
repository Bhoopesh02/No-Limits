import { clamp } from '../core/clamp';

export interface SoundEffectsOptions {
  readonly maxTireVolume?: number;
  readonly maxNitroVolume?: number;
}

/**
 * Procedural synthesiser for vehicle physics sound effects (tire squeal, nitro burn)
 * and event audio (countdown tones, UI clicks, collision impacts).
 */
export class SoundEffects {
  private readonly ctx: AudioContext;
  private readonly outNode: GainNode;

  // 1. Continuous Tire Squeal
  private readonly tireNoiseSource: AudioBufferSourceNode;
  private readonly tireFilter: BiquadFilterNode;
  private readonly tireGain: GainNode;
  private readonly maxTireVol: number;

  // 2. Continuous Nitro Whoosh
  private readonly nitroNoiseSource: AudioBufferSourceNode;
  private readonly nitroSubOsc: OscillatorNode;
  private readonly nitroFilter: BiquadFilterNode;
  private readonly nitroGain: GainNode;
  private readonly maxNitroVol: number;

  private isRunning = false;

  constructor(ctx: AudioContext, destination: GainNode, options: SoundEffectsOptions = {}) {
    this.ctx = ctx;
    this.outNode = destination;
    this.maxTireVol = options.maxTireVolume ?? 0.45;
    this.maxNitroVol = options.maxNitroVolume ?? 0.65;

    // --- Tire Squeal Setup ---
    const tireBuffer = this.createNoiseBuffer(ctx, 1.0);
    this.tireNoiseSource = ctx.createBufferSource();
    this.tireNoiseSource.buffer = tireBuffer;
    this.tireNoiseSource.loop = true;

    this.tireFilter = ctx.createBiquadFilter();
    this.tireFilter.type = 'bandpass';
    this.tireFilter.frequency.value = 2100;
    this.tireFilter.Q.value = 4.5;

    this.tireGain = ctx.createGain();
    this.tireGain.gain.value = 0;

    this.tireNoiseSource.connect(this.tireFilter);
    this.tireFilter.connect(this.tireGain);
    this.tireGain.connect(this.outNode);

    // --- Nitro Whoosh Setup ---
    const nitroBuffer = this.createNoiseBuffer(ctx, 1.0);
    this.nitroNoiseSource = ctx.createBufferSource();
    this.nitroNoiseSource.buffer = nitroBuffer;
    this.nitroNoiseSource.loop = true;

    this.nitroSubOsc = ctx.createOscillator();
    this.nitroSubOsc.type = 'sine';
    this.nitroSubOsc.frequency.value = 65;

    this.nitroFilter = ctx.createBiquadFilter();
    this.nitroFilter.type = 'lowpass';
    this.nitroFilter.frequency.value = 1600;

    this.nitroGain = ctx.createGain();
    this.nitroGain.gain.value = 0;

    this.nitroNoiseSource.connect(this.nitroFilter);
    this.nitroSubOsc.connect(this.nitroFilter);
    this.nitroFilter.connect(this.nitroGain);
    this.nitroGain.connect(this.outNode);
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      this.tireNoiseSource.start();
      this.nitroNoiseSource.start();
      this.nitroSubOsc.start();
    } catch {
      // Catch start on already active nodes in test mocks or edge cases
    }
  }

  public stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.rampParam(this.tireGain.gain, 0, 0.05);
    this.rampParam(this.nitroGain.gain, 0, 0.05);
  }

  /**
   * Update tire squeal and nitro whoosh. Zero-allocation simulation step.
   */
  public update(lateralSpeed: number, isDrifting: boolean, nitroActiveTime: number, speed: number): void {
    if (!this.isRunning) return;

    // --- Tire Squeal Dynamics ---
    const absLat = Math.abs(lateralSpeed);
    let targetTireGain = 0;

    if (isDrifting || absLat > 2.0) {
      const slipFactor = clamp((absLat - 1.5) / 5.5, 0, 1);
      targetTireGain = slipFactor * this.maxTireVol;
      // Modulate frequency slightly with total vehicle speed (higher pitch at high speed drift)
      const centerFreq = 1800 + clamp(speed, 0, 80) * 12;
      this.rampParam(this.tireFilter.frequency, centerFreq, 0.04);
    }

    this.rampParam(this.tireGain.gain, targetTireGain, targetTireGain > 0 ? 0.04 : 0.08);

    // --- Nitro Whoosh Dynamics ---
    const targetNitroGain = nitroActiveTime > 0 ? this.maxNitroVol : 0;
    this.rampParam(this.nitroGain.gain, targetNitroGain, targetNitroGain > 0 ? 0.03 : 0.1);
  }

  /**
   * Play countdown beep (3, 2, 1 at 480 Hz, GO at 960 Hz).
   */
  public playCountdown(count: number | 'GO'): void {
    const isGo = count === 'GO';
    const freq = isGo ? 960 : 480;
    const duration = isGo ? 0.28 : 0.12;
    const gainValue = isGo ? 0.6 : 0.45;

    this.playTone(freq, duration, gainValue, isGo ? 'triangle' : 'sine');
  }

  /**
   * Play short, crisp UI button click or navigation chirp.
   */
  public playUiClick(): void {
    try {
      const now = this.ctx.currentTime || 0;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(450, now + 0.025);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

      osc.connect(gain);
      gain.connect(this.outNode);

      osc.start(now);
      osc.stop(now + 0.03);
    } catch {
      // Audio node scheduling guard
    }
  }

  /**
   * Play car collision / barrier impact thud.
   */
  public playCollision(impactSpeed = 10): void {
    try {
      const now = this.ctx.currentTime || 0;
      const intensity = clamp(impactSpeed / 25, 0.2, 1.0);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.08);

      gain.gain.setValueAtTime(0.6 * intensity, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(this.outNode);

      osc.start(now);
      osc.stop(now + 0.11);
    } catch {
      // Audio node scheduling guard
    }
  }

  public dispose(): void {
    this.stop();
    try {
      this.tireNoiseSource.stop();
      this.nitroNoiseSource.stop();
      this.nitroSubOsc.stop();
    } catch {
      // Safe stop
    }

    try {
      this.tireNoiseSource.disconnect();
      this.tireFilter.disconnect();
      this.tireGain.disconnect();
      this.nitroNoiseSource.disconnect();
      this.nitroSubOsc.disconnect();
      this.nitroFilter.disconnect();
      this.nitroGain.disconnect();
    } catch {
      // Safe cleanup
    }
  }

  private playTone(freq: number, duration: number, peakGain: number, type: OscillatorType): void {
    try {
      const now = this.ctx.currentTime || 0;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(peakGain, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.outNode);

      osc.start(now);
      osc.stop(now + duration + 0.01);
    } catch {
      // Audio node scheduling guard
    }
  }

  private rampParam(param: AudioParam, target: number, timeConst: number): void {
    if (typeof param.setTargetAtTime !== 'function') {
      param.value = target;
      return;
    }
    const now = this.ctx.currentTime || 0;
    try {
      param.setTargetAtTime(target, now, timeConst);
    } catch {
      param.value = target;
    }
  }

  private createNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
    const rate = ctx.sampleRate || 44100;
    const length = Math.floor(rate * seconds);
    const buffer = ctx.createBuffer(1, length, rate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }
}
