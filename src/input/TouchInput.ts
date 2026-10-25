import { stepSteeringRamp } from '../core/steeringRamp';
import { InputState } from '../data/InputState';
import { TouchControlState } from '../data/TouchControlState';
import { InputProvider } from './InputProvider';

/**
 * Reads touch button states from a shared TouchControlState object and applies
 * a deterministic fixed-step steering ramp toward target deflection.
 * Zero heap allocations during poll().
 */
export class TouchInput implements InputProvider {
  private readonly state: TouchControlState;
  private readonly fixedDt: number;
  private currentSteer = 0;

  constructor(state: TouchControlState, fixedDt = 1 / 60) {
    this.state = state;
    this.fixedDt = fixedDt;
  }

  public poll(outState: InputState): void {
    // 1. Step steering ramp smoothly and deterministically per fixed tick
    this.currentSteer = stepSteeringRamp(
      this.currentSteer,
      this.state.steerLeft,
      this.state.steerRight,
      this.fixedDt,
    );
    outState.steer = this.currentSteer;

    // 2. Binary controls map to full range (zero allocations)
    outState.throttle = this.state.throttle ? 1.0 : 0.0;
    outState.brake = this.state.brake ? 1.0 : 0.0;
    outState.nitro = this.state.nitro;
    outState.handbrake = this.state.handbrake;
    outState.pause = false;
  }

  public reset(): void {
    this.currentSteer = 0;
  }

  public dispose(): void {
    this.reset();
  }
}
