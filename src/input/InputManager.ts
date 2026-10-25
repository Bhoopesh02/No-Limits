import { InputProvider } from './InputProvider';
import { createInputState, InputState } from '../data/InputState';

export class InputManager {
  private provider: InputProvider;
  private readonly state: InputState = createInputState();

  constructor(provider: InputProvider) {
    this.provider = provider;
  }

  public setProvider(provider: InputProvider): void {
    this.provider = provider;
  }

  public getProvider(): InputProvider {
    return this.provider;
  }

  /**
   * Polls the active provider into the cached InputState and returns it.
   * Zero heap allocations.
   */
  public poll(): InputState {
    this.provider.poll(this.state);
    return this.state;
  }

  public getState(): InputState {
    return this.state;
  }

  public dispose(): void {
    if (this.provider.dispose) {
      this.provider.dispose();
    }
  }
}
