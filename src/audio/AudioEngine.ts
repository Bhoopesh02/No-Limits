import { EngineSound } from './EngineSound';
import { Mixer } from './Mixer';

export interface AudioEngineOptions {
  readonly initialMaster?: number;
  readonly initialSfx?: number;
  readonly initialMusic?: number;
  readonly audioContext?: AudioContext;
}

export interface AudioVolumes {
  readonly masterVolume: number;
  readonly sfxVolume: number;
  readonly musicVolume: number;
}

/**
 * Top-level Web Audio API coordinator.
 * Manages audio context lifecycle, user gesture unlock, mixer buses, and procedural vehicle sound.
 */
export class AudioEngine {
  private readonly ctx: AudioContext | null = null;
  private readonly mixer: Mixer | null = null;
  private playerEngine: EngineSound | null = null;

  private isSupported = false;
  private isUnlocked = false;
  private isPaused = false;
  private unlockListenerAttached = false;

  constructor(options: AudioEngineOptions = {}) {
    if (options.audioContext) {
      this.ctx = options.audioContext;
      this.isSupported = true;
    } else if (typeof window !== 'undefined') {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        try {
          this.ctx = new AudioContextClass();
          this.isSupported = true;
        } catch {
          this.isSupported = false;
        }
      }
    }

    if (this.ctx) {
      this.mixer = new Mixer(this.ctx, {
        initialMaster: options.initialMaster,
        initialSfx: options.initialSfx,
        initialMusic: options.initialMusic,
      });

      this.playerEngine = new EngineSound(this.ctx, this.mixer.getEngineGainNode());

      this.isUnlocked = this.ctx.state === 'running';
      if (!this.isUnlocked) {
        this.attachUnlockListeners();
      }
    }
  }

  public isAudioSupported(): boolean {
    return this.isSupported;
  }

  public isAudioUnlocked(): boolean {
    return this.isUnlocked;
  }

  public getAudioContext(): AudioContext | null {
    return this.ctx;
  }

  public getMixer(): Mixer | null {
    return this.mixer;
  }

  public getPlayerEngine(): EngineSound | null {
    return this.playerEngine;
  }

  /**
   * Unlock AudioContext on user interaction.
   */
  public async unlock(): Promise<boolean> {
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        return false;
      }
    }
    this.isUnlocked = this.ctx.state === 'running';
    return this.isUnlocked;
  }

  public startPlayerEngine(): void {
    if (!this.playerEngine) return;
    this.playerEngine.start();
  }

  public stopPlayerEngine(): void {
    if (!this.playerEngine) return;
    this.playerEngine.stop();
  }

  public updatePlayerEngine(speed: number, throttle: number, isReversing: boolean, dt: number): void {
    if (!this.playerEngine) return;
    this.playerEngine.update(speed, throttle, isReversing, dt);
  }

  public syncVolumes(volumes: AudioVolumes): void {
    if (!this.mixer) return;
    this.mixer.setMasterVolume(volumes.masterVolume);
    this.mixer.setSfxVolume(volumes.sfxVolume);
    this.mixer.setMusicVolume(volumes.musicVolume);
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
    if (!this.mixer) return;
    if (paused) {
      this.mixer.mute(0.08);
    } else {
      this.mixer.unmute(0.08);
    }
  }

  public isAudioPaused(): boolean {
    return this.isPaused;
  }

  public dispose(): void {
    this.detachUnlockListeners();
    this.playerEngine?.dispose();
    this.mixer?.dispose();
    if (this.ctx && this.ctx.state !== 'closed') {
      try {
        this.ctx.close();
      } catch {
        // Safe close
      }
    }
  }

  private readonly onUserInteraction = (): void => {
    void this.unlock();
    this.detachUnlockListeners();
  };

  private attachUnlockListeners(): void {
    if (typeof window === 'undefined' || this.unlockListenerAttached) return;
    this.unlockListenerAttached = true;
    window.addEventListener('pointerdown', this.onUserInteraction, { once: true, passive: true });
    window.addEventListener('keydown', this.onUserInteraction, { once: true, passive: true });
    window.addEventListener('touchstart', this.onUserInteraction, { once: true, passive: true });
  }

  private detachUnlockListeners(): void {
    if (typeof window === 'undefined' || !this.unlockListenerAttached) return;
    this.unlockListenerAttached = false;
    window.removeEventListener('pointerdown', this.onUserInteraction);
    window.removeEventListener('keydown', this.onUserInteraction);
    window.removeEventListener('touchstart', this.onUserInteraction);
  }
}
