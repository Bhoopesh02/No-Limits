import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, SettingsService, type UserSettings } from './SettingsService';

class MockStorage implements Storage {
  private store: Record<string, string> = {};

  public get length(): number {
    return Object.keys(this.store).length;
  }

  public clear(): void {
    this.store = {};
  }

  public getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  public key(index: number): string | null {
    return Object.keys(this.store)[index] ?? null;
  }

  public removeItem(key: string): void {
    delete this.store[key];
  }

  public setItem(key: string, value: string): void {
    this.store[key] = value;
  }
}

describe('SettingsService', () => {
  let mockStorage: MockStorage;

  beforeEach(() => {
    mockStorage = new MockStorage();
  });

  it('initializes with default settings when storage is empty', () => {
    const service = new SettingsService({ storage: mockStorage });
    expect(service.getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('loads existing valid settings from storage', () => {
    mockStorage.setItem(
      'nolimits:settings:v1',
      JSON.stringify({
        graphicsTier: 'high',
        masterVolume: 50,
        speedUnits: 'mph',
      }),
    );

    const service = new SettingsService({ storage: mockStorage });
    expect(service.get('graphicsTier')).toBe('high');
    expect(service.get('masterVolume')).toBe(50);
    expect(service.get('speedUnits')).toBe('mph');
    expect(service.get('sfxVolume')).toBe(DEFAULT_SETTINGS.sfxVolume);
  });

  it('sanitizes invalid or out-of-range values', () => {
    mockStorage.setItem(
      'nolimits:settings:v1',
      JSON.stringify({
        graphicsTier: 'invalid-tier',
        resolutionScale: 2.5,
        masterVolume: 200,
        speedUnits: 'knots',
        touchSteerSide: 'upside-down',
        touchNitroSide: 'space',
      }),
    );

    const service = new SettingsService({ storage: mockStorage });
    expect(service.get('graphicsTier')).toBe('auto');
    expect(service.get('resolutionScale')).toBe(1.0);
    expect(service.get('masterVolume')).toBe(100);
    expect(service.get('speedUnits')).toBe('kmh');
    expect(service.get('touchSteerSide')).toBe('left');
    expect(service.get('touchNitroSide')).toBe('pedals');
  });

  it('updates settings and persists to storage', () => {
    const service = new SettingsService({ storage: mockStorage });
    let notified: UserSettings | null = null;
    service.subscribe((s) => {
      notified = s;
    });

    service.update({ graphicsTier: 'low', masterVolume: 40 });

    expect(service.get('graphicsTier')).toBe('low');
    expect(service.get('masterVolume')).toBe(40);
    expect((notified as UserSettings | null)?.graphicsTier).toBe('low');
    expect((notified as UserSettings | null)?.masterVolume).toBe(40);

    const raw = mockStorage.getItem('nolimits:settings:v1');
    expect(raw).toBeTruthy();
    const stored = JSON.parse(raw!);
    expect(stored.graphicsTier).toBe('low');
    expect(stored.masterVolume).toBe(40);
  });

  it('resets settings to defaults', () => {
    const service = new SettingsService({
      storage: mockStorage,
      initialSettings: { graphicsTier: 'low', masterVolume: 10 },
    });
    service.resetToDefaults();
    expect(service.getSettings()).toEqual(DEFAULT_SETTINGS);
  });
});
