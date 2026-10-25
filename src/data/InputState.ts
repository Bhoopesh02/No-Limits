export interface InputState {
  steer: number; // -1 (full left) to 1 (full right)
  throttle: number; // 0 to 1
  brake: number; // 0 to 1
  handbrake: boolean;
  nitro: boolean;
  pause: boolean;
}

export function createInputState(): InputState {
  return {
    steer: 0,
    throttle: 0,
    brake: 0,
    handbrake: false,
    nitro: false,
    pause: false,
  };
}

export function resetInputState(state: InputState): void {
  state.steer = 0;
  state.throttle = 0;
  state.brake = 0;
  state.handbrake = false;
  state.nitro = false;
  state.pause = false;
}
