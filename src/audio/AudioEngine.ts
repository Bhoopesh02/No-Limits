import type { EventBus, Unsubscribe } from '../core/EventBus';
import type { GameEvents } from '../data/GameEvents';
import { EngineSound } from './EngineSound';
import { Mixer } from './Mixer';
import { SoundEffects } from './SoundEffects';

export interface AudioEngineOptions {
  readonly initialMaster?: number;
  readonly initialSfx?: number;
  readonly initialMusic?: number;
  readonly audioContext?: AudioContext;
  readonly bus?: EventBus<GameEvents>;
}

export interface AudioVolumes {
  readonly masterVolume: number;
  readonly sfxVolume: number;
  readonly musicVolume: number;
}

/**
 * Top-level Web Audio API coordinator.
 * Manages audio context lifecycle, user gesture unlock, mixer buses, engine audio, and physics SFX.
 */
export class AudioEngine {
  private readonly ctx: AudioContext | null = null;
  private readonly mixer: Mixer | null = null;
  private playerEngine: EngineSound | null = null;
  private soundEffects: SoundEffects | null = null;

  private isSupported = false;
  private isUnlocked = false;
  private isPaused = false;
  private unlockListenerAttached = false;
  private readonly busUnsubs: Unsubscribe[] = [];

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
      this.soundEffects = new SoundEffects(this.ctx, this.mixer.getSfxGainNode());

      this.isUnlocked = this.ctx.state === 'running';
      if (!this.isUnlocked) {
        this.attachUnlockListeners();
      }
    }

    if (options.bus) {
      this.busUnsubs.push(
        options.bus.on('race:countdown', ({ count }) => {
          this.soundEffects?.playCountdown(count);
        }),
        options.bus.on('menu:navigate', () => {
          this.soundEffects?.playUiClick();
        }),
      );
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

  public getSoundEffects(): SoundEffects | null {
    return this.soundEffects;
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
    this.playerEngine?.start();
    this.soundEffects?.start();
  }

  public stopPlayerEngine(): void {
    this.playerEngine?.stop();
    this.soundEffects?.stop();
  }

  public updatePlayerEngine(speed: number, throttle: number, isReversing: boolean, dt: number): void {
    this.playerEngine?.update(speed, throttle, isReversing, dt);
  }

  public updatePlayerAudio(
    forwardSpeed: number,
    lateralSpeed: number,
    throttle: number,
    isReversing: boolean,
    isDrifting: boolean,
    nitroActiveTime: number,
    dt: number,
  ): void {
    this.playerEngine?.update(forwardSpeed, throttle, isReversing, dt);
    this.soundEffects?.update(lateralSpeed, isDrifting, nitroActiveTime, Math.abs(forwardSpeed));
  }

  public playCountdown(count: number | 'GO'): void {
    this.soundEffects?.playCountdown(count);
  }

  public playUiClick(): void {
    this.soundEffects?.playUiClick();
  }

  public playCollision(impactSpeed?: number): void {
    this.soundEffects?.playCollision(impactSpeed);
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
    for (const unsub of this.busUnsubs) {
      unsub();
    }
    this.busUnsubs.length = 0;
    this.playerEngine?.dispose();
    this.soundEffects?.dispose();
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
