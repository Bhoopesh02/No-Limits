import { createInputState, InputState, resetInputState } from '../data/InputState';
import { InputProvider } from './InputProvider';

export type DeviceType = 'keyboard' | 'gamepad' | 'touch';

export interface ProviderEntry {
  device: DeviceType;
  provider: InputProvider;
}

export type InputProvidersConfig =
  InputProvider | Partial<Record<DeviceType, InputProvider>> | readonly ProviderEntry[];

export class InputManager {
  private readonly providers: ProviderEntry[] = [];
  private readonly tempState: InputState = createInputState();
  private readonly state: InputState = createInputState();
  private lastUsed: DeviceType = 'keyboard';

  constructor(config?: InputProvidersConfig) {
    if (config) {
      if ('poll' in config) {
        // Single provider backward compatibility
        this.addProvider('keyboard', config);
      } else if (Array.isArray(config)) {
        for (let i = 0; i < config.length; i++) {
          this.providers.push(config[i]);
        }
      } else {
        const record = config as Partial<Record<DeviceType, InputProvider>>;
        if (record.keyboard) this.addProvider('keyboard', record.keyboard);
        if (record.gamepad) this.addProvider('gamepad', record.gamepad);
        if (record.touch) this.addProvider('touch', record.touch);
      }
    }
  }

  public addProvider(device: DeviceType, provider: InputProvider): void {
    this.providers.push({ device, provider });
  }

  public setProvider(provider: InputProvider, device: DeviceType = 'keyboard'): void {
    this.providers.length = 0;
    this.addProvider(device, provider);
  }

  public getProvider(): InputProvider | undefined {
    return this.providers[0]?.provider;
  }

  public get lastUsedDevice(): DeviceType {
    return this.lastUsed;
  }

  /**
   * Polls all registered providers, tracks the last-used non-neutral device,
   * merges inputs into the preallocated cached InputState, and returns it.
   *
   * Merge rules:
   * - steer: largest absolute magnitude
   * - throttle: maximum value
   * - brake: maximum value
   * - booleans (handbrake, nitro, pause): logical OR
   *
   * Zero heap allocations during execution.
   */
  public poll(): InputState {
    resetInputState(this.state);

    const count = this.providers.length;
    for (let i = 0; i < count; i++) {
      const entry = this.providers[i];
      resetInputState(this.tempState);
      entry.provider.poll(this.tempState);

      // Track last-used device on non-neutral input
      const isNonNeutral =
        Math.abs(this.tempState.steer) > 0.001 ||
        this.tempState.throttle > 0.001 ||
        this.tempState.brake > 0.001 ||
        this.tempState.handbrake ||
        this.tempState.nitro ||
        this.tempState.pause;

      if (isNonNeutral) {
        this.lastUsed = entry.device;
      }

      // 1. Steer: largest magnitude
      if (Math.abs(this.tempState.steer) > Math.abs(this.state.steer)) {
        this.state.steer = this.tempState.steer;
      }

      // 2. Throttle and brake: maximum
      if (this.tempState.throttle > this.state.throttle) {
        this.state.throttle = this.tempState.throttle;
      }
      if (this.tempState.brake > this.state.brake) {
        this.state.brake = this.tempState.brake;
      }

      // 3. Booleans: logical OR
      if (this.tempState.handbrake) this.state.handbrake = true;
      if (this.tempState.nitro) this.state.nitro = true;
      if (this.tempState.pause) this.state.pause = true;
    }

    return this.state;
  }

  public getState(): InputState {
    return this.state;
  }

  public dispose(): void {
    for (let i = 0; i < this.providers.length; i++) {
      this.providers[i].provider.dispose?.();
    }
  }
}
