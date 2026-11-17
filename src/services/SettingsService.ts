import { clamp } from '../core/clamp';
import type { GraphicsTierOption } from '../data/GraphicsTierConfig';

export type ControlSchemeSetting = 'auto' | 'keyboard' | 'touch' | 'gamepad';
export type SpeedUnitSetting = 'kmh' | 'mph';
export type TouchSteerSide = 'left' | 'right';
export type TouchNitroSide = 'pedals' | 'steer';

export interface UserSettings {
  readonly graphicsTier: GraphicsTierOption;
  readonly resolutionScale: number;
  readonly masterVolume: number;
  readonly sfxVolume: number;
  readonly musicVolume: number;
  readonly controlScheme: ControlSchemeSetting;
  readonly steeringSensitivity: number;
  readonly touchSteerSide: TouchSteerSide;
  readonly touchNitroSide: TouchNitroSide;
  readonly reduceMotion: boolean;
  readonly speedUnits: SpeedUnitSetting;
  readonly showDevStats: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  graphicsTier: 'auto',
  resolutionScale: 1.0,
  masterVolume: 80,
  sfxVolume: 90,
  musicVolume: 75,
  controlScheme: 'auto',
  steeringSensitivity: 1.0,
  touchSteerSide: 'left',
  touchNitroSide: 'pedals',
  reduceMotion: false,
  speedUnits: 'kmh',
  showDevStats: false,
};

const STORAGE_KEY = 'nolimits:settings:v1';

export interface SettingsServiceOptions {
  readonly storage?: Storage;
  readonly initialSettings?: Partial<UserSettings>;
}

export class SettingsService {
  private readonly storage: Storage | null;
  private settings: UserSettings;
  private readonly listeners = new Set<(settings: UserSettings) => void>();

  constructor(options: SettingsServiceOptions = {}) {
    this.storage =
      options.storage !== undefined
        ? options.storage
        : typeof localStorage !== 'undefined'
          ? localStorage
          : null;

    const loaded = this.loadFromStorage();
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...loaded,
      ...options.initialSettings,
    };

    // Sanitize values
    this.settings = this.sanitize(this.settings);
  }

  public getSettings(): UserSettings {
    return this.settings;
  }

  public get<K extends keyof UserSettings>(key: K): UserSettings[K] {
    return this.settings[key];
  }

  public update(patch: Partial<UserSettings>): void {
    const next: UserSettings = this.sanitize({
      ...this.settings,
      ...patch,
    });

    let hasChange = false;
    for (const key of Object.keys(next) as (keyof UserSettings)[]) {
      if (this.settings[key] !== next[key]) {
        hasChange = true;
        break;
      }
    }

    if (!hasChange) {
      return;
    }

    this.settings = next;
    this.saveToStorage();
    this.notifyListeners();
  }

  public resetToDefaults(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.saveToStorage();
    this.notifyListeners();
  }

  public subscribe(listener: (settings: UserSettings) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private sanitize(s: UserSettings): UserSettings {
    const validTiers: GraphicsTierOption[] = ['auto', 'low', 'medium', 'high'];
    const graphicsTier = validTiers.includes(s.graphicsTier) ? s.graphicsTier : 'auto';

    const validControls: ControlSchemeSetting[] = ['auto', 'keyboard', 'touch', 'gamepad'];
    const controlScheme = validControls.includes(s.controlScheme) ? s.controlScheme : 'auto';

    const validUnits: SpeedUnitSetting[] = ['kmh', 'mph'];
    const speedUnits = validUnits.includes(s.speedUnits) ? s.speedUnits : 'kmh';

    const touchSteerSide: TouchSteerSide = s.touchSteerSide === 'right' ? 'right' : 'left';
    const touchNitroSide: TouchNitroSide = s.touchNitroSide === 'steer' ? 'steer' : 'pedals';

    return {
      graphicsTier,
      resolutionScale: clamp(s.resolutionScale, 0.6, 1.0),
      masterVolume: Math.round(clamp(s.masterVolume, 0, 100)),
      sfxVolume: Math.round(clamp(s.sfxVolume, 0, 100)),
      musicVolume: Math.round(clamp(s.musicVolume, 0, 100)),
      controlScheme,
      steeringSensitivity: clamp(s.steeringSensitivity, 0.5, 1.5),
      touchSteerSide,
      touchNitroSide,
      reduceMotion: Boolean(s.reduceMotion),
      speedUnits,
      showDevStats: Boolean(s.showDevStats),
    };
  }

  private loadFromStorage(): Partial<UserSettings> {
    if (!this.storage) {
      return {};
    }
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    } catch {
      // In private browsing or corrupted storage, safely use defaults
    }
    return {};
  }

  private saveToStorage(): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // Quota exceeded or storage disabled
    }
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.settings);
    }
  }
}
