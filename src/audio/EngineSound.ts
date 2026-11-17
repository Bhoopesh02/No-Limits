import { clamp } from '../core/clamp';
import {
  calculateFundamentalFrequency,
  calculateGear,
  calculateLayerGains,
  calculateTargetRpm,
  IDLE_RPM,
  LayerGains,
  REDLINE_RPM,
} from './engineMath';

export {
  calculateFundamentalFrequency,
  calculateGear,
  calculateLayerGains,
  calculateTargetRpm,
  IDLE_RPM,
  REDLINE_RPM,
  type LayerGains,
};

/**
 * Procedural synthesiser and crossfader for authentic vehicle engine acoustics.
 */
export class EngineSound {
  private readonly ctx: AudioContext;
  private readonly outNode: GainNode;

  // Synthesis nodes
  private readonly lowOsc: OscillatorNode;
  private readonly lowFilter: BiquadFilterNode;
  private readonly lowGain: GainNode;

  private readonly midOsc: OscillatorNode;
  private readonly midFilter: BiquadFilterNode;
  private readonly midGain: GainNode;

  private readonly highOsc: OscillatorNode;
  private readonly highFilter: BiquadFilterNode;
  private readonly highShaper: WaveShaperNode;
  private readonly highGain: GainNode;

  private readonly noiseSource: AudioBufferSourceNode;
  private readonly noiseFilter: BiquadFilterNode;
  private readonly noiseGain: GainNode;

  private readonly masterFilter: BiquadFilterNode;
  private readonly masterGain: GainNode;

  // Running state
  private rpm = IDLE_RPM;
  private gear = 1;
  private isRunning = false;
  private revLimiterTime = 0;
  private isLimiting = false;

  constructor(ctx: AudioContext, destination: GainNode) {
    this.ctx = ctx;
    this.outNode = destination;

    // Master filter and gain
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0;
    this.masterFilter = ctx.createBiquadFilter();
    this.masterFilter.type = 'lowpass';
    this.masterFilter.frequency.value = 1800;

    this.masterFilter.connect(this.masterGain);
    this.masterGain.connect(this.outNode);

    // 1. Low / Idle layer
    this.lowOsc = ctx.createOscillator();
    this.lowOsc.type = 'sawtooth';
    this.lowFilter = ctx.createBiquadFilter();
    this.lowFilter.type = 'lowpass';
    this.lowFilter.frequency.value = 320;
    this.lowGain = ctx.createGain();
    this.lowGain.gain.value = 1.0;

    this.lowOsc.connect(this.lowFilter);
    this.lowFilter.connect(this.lowGain);
    this.lowGain.connect(this.masterFilter);

    // 2. Mid layer
    this.midOsc = ctx.createOscillator();
    this.midOsc.type = 'sawtooth';
    this.midFilter = ctx.createBiquadFilter();
    this.midFilter.type = 'bandpass';
    this.midFilter.frequency.value = 650;
    this.midFilter.Q.value = 1.8;
    this.midGain = ctx.createGain();
    this.midGain.gain.value = 0.0;

    this.midOsc.connect(this.midFilter);
    this.midFilter.connect(this.midGain);
    this.midGain.connect(this.masterFilter);

    // 3. High layer with soft-clipping waveshaper
    this.highOsc = ctx.createOscillator();
    this.highOsc.type = 'sawtooth';
    this.highShaper = ctx.createWaveShaper();
    this.highShaper.curve = this.createDistortionCurve(256);
    this.highFilter = ctx.createBiquadFilter();
    this.highFilter.type = 'peaking';
    this.highFilter.frequency.value = 1600;
    this.highFilter.gain.value = 4.0;
    this.highGain = ctx.createGain();
    this.highGain.gain.value = 0.0;

    this.highOsc.connect(this.highShaper);
    this.highShaper.connect(this.highFilter);
    this.highFilter.connect(this.highGain);
    this.highGain.connect(this.masterFilter);

    // 4. Looping noise buffer for induction
    const noiseBuffer = this.createNoiseBuffer(ctx, 1.0);
    this.noiseSource = ctx.createBufferSource();
    this.noiseSource.buffer = noiseBuffer;
    this.noiseSource.loop = true;
    this.noiseFilter = ctx.createBiquadFilter();
    this.noiseFilter.type = 'bandpass';
    this.noiseFilter.frequency.value = 800;
    this.noiseGain = ctx.createGain();
    this.noiseGain.gain.value = 0.0;

    this.noiseSource.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.masterFilter);
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      this.lowOsc.start();
      this.midOsc.start();
      this.highOsc.start();
      this.noiseSource.start();
    } catch {
      // Catch start on already active nodes in edge cases
    }

    this.rampParam(this.masterGain.gain, 0.5, 0.1);
  }

  public stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.rampParam(this.masterGain.gain, 0, 0.05);
  }

  /**
   * Update engine acoustics. Non-allocating hot-path simulation step.
   */
  public update(speed: number, throttle: number, isReversing: boolean, dt: number): void {
    if (!this.isRunning) return;

    this.gear = calculateGear(speed, this.gear, isReversing);
    const targetRpm = calculateTargetRpm(speed, throttle, this.gear);

    // Inertial RPM smoothing: fast rise when accelerating, gentle fall on overrun
    const rate = targetRpm > this.rpm ? 14.0 : 6.5;
    this.rpm += (targetRpm - this.rpm) * clamp(rate * dt, 0, 1);

    // Rev-limiter bounce
    this.isLimiting = this.rpm >= REDLINE_RPM + 100;
    let limiterAttenuation = 1.0;
    if (this.isLimiting) {
      this.revLimiterTime += dt;
      // 18 Hz bounce pulse
      limiterAttenuation = Math.sin(this.revLimiterTime * 18 * Math.PI * 2) > 0 ? 1.0 : 0.2;
    } else {
      this.revLimiterTime = 0;
    }

    // Frequencies
    const f0 = calculateFundamentalFrequency(this.rpm);
    this.rampParam(this.lowOsc.frequency, f0, 0.04);
    this.rampParam(this.midOsc.frequency, f0, 0.04);
    this.rampParam(this.highOsc.frequency, f0, 0.04);

    // Dynamic filters
    const filterCutoff = 800 + clamp(throttle, 0, 1) * 3200 + (this.rpm / REDLINE_RPM) * 800;
    this.rampParam(this.masterFilter.frequency, filterCutoff, 0.05);

    // Crossfading layer gains
    const gains = calculateLayerGains(this.rpm, throttle);
    this.rampParam(this.lowGain.gain, gains.idle * 0.9, 0.05);
    this.rampParam(this.midGain.gain, gains.mid * 0.75, 0.05);
    this.rampParam(this.highGain.gain, gains.high * 0.65, 0.05);
    this.rampParam(this.noiseGain.gain, gains.noise * 0.3, 0.05);

    // Overall engine volume: idle sits at ~0.4, acceleration pumps up to 0.85
    const baseVol = 0.4 + clamp(throttle, 0, 1) * 0.45;
    this.rampParam(this.masterGain.gain, baseVol * limiterAttenuation, 0.03);
  }

  public getRpm(): number {
    return this.rpm;
  }

  public getGear(): number {
    return this.gear;
  }

  public isRevLimiting(): boolean {
    return this.isLimiting;
  }

  public dispose(): void {
    this.stop();
    try {
      this.lowOsc.stop();
      this.midOsc.stop();
      this.highOsc.stop();
      this.noiseSource.stop();
    } catch {
      // Safe stop
    }

    try {
      this.lowOsc.disconnect();
      this.midOsc.disconnect();
      this.highOsc.disconnect();
      this.noiseSource.disconnect();
      this.masterFilter.disconnect();
      this.masterGain.disconnect();
    } catch {
      // Disconnection cleanup
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

  private createDistortionCurve(samples: number): Float32Array<ArrayBuffer> {
    const buffer = new ArrayBuffer(samples * Float32Array.BYTES_PER_ELEMENT);
    const curve = new Float32Array(buffer);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Soft saturation with tanh
      curve[i] = Math.tanh(1.6 * x);
    }
    return curve;
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
