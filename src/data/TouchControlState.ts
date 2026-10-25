export interface TouchControlState {
  steerLeft: boolean;
  steerRight: boolean;
  throttle: boolean;
  brake: boolean;
  nitro: boolean;
  handbrake: boolean;
}

export function createTouchControlState(): TouchControlState {
  return {
    steerLeft: false,
    steerRight: false,
    throttle: false,
    brake: false,
    nitro: false,
    handbrake: false,
  };
}

export function resetTouchControlState(state: TouchControlState): void {
  state.steerLeft = false;
  state.steerRight = false;
  state.throttle = false;
  state.brake = false;
  state.nitro = false;
  state.handbrake = false;
}
