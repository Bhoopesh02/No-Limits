import { InputState } from '../data/InputState';

export interface InputProvider {
  /**
   * Polls current device inputs and mutates outState in place.
   * Zero heap allocations allowed during poll.
   */
  poll(outState: InputState): void;

  /**
   * Cleans up event listeners or background resources.
   */
  dispose?(): void;
}
