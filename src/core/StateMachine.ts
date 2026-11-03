import type { EventBus } from './EventBus';

export interface StateMachineEventMap<TState extends string> {
  'state:enter': { state: TState; from?: TState };
  'state:exit': { state: TState; to: TState };
  'state:change': { from: TState; to: TState };
}

export interface StateMachineOptions<TState extends string> {
  readonly initial: TState;
  readonly transitions: Readonly<Record<TState, readonly TState[]>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly bus?: EventBus<any>;
  readonly enterEvent?: string;
  readonly exitEvent?: string;
  readonly changeEvent?: string;
}

/**
 * Generic, typed finite state machine.
 *
 * Rules:
 * - Validates transitions against configured transition table.
 * - Throws a descriptive Error on invalid transitions.
 * - Emits exit and enter events via the provided EventBus (exit fires before enter).
 * - Zero allocations on transition by reusing pre-allocated event payloads.
 */
export class StateMachine<TState extends string> {
  private currentState: TState;
  private readonly transitions: Readonly<Record<TState, readonly TState[]>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly bus?: EventBus<any>;
  private readonly enterEvent: string;
  private readonly exitEvent: string;
  private readonly changeEvent: string;

  private readonly enterPayload: { state: TState; from?: TState };
  private readonly exitPayload: { state: TState; to: TState };
  private readonly changePayload: { from: TState; to: TState };

  constructor(options: StateMachineOptions<TState>) {
    this.currentState = options.initial;
    this.transitions = options.transitions;
    this.bus = options.bus;
    this.enterEvent = options.enterEvent ?? 'state:enter';
    this.exitEvent = options.exitEvent ?? 'state:exit';
    this.changeEvent = options.changeEvent ?? 'state:change';

    this.enterPayload = {
      state: options.initial,
      from: undefined,
    };
    this.exitPayload = {
      state: options.initial,
      to: options.initial,
    };
    this.changePayload = {
      from: options.initial,
      to: options.initial,
    };
  }

  public getState(): TState {
    return this.currentState;
  }

  public canTransition(to: TState): boolean {
    const allowed = this.transitions[this.currentState];
    return allowed !== undefined && allowed.includes(to);
  }

  public getAllowedTransitions(): readonly TState[] {
    return this.transitions[this.currentState] ?? [];
  }

  public start(): void {
    if (this.bus) {
      this.enterPayload.state = this.currentState;
      this.enterPayload.from = undefined;
      this.bus.emit(this.enterEvent, this.enterPayload);
    }
  }

  public transition(to: TState): void {
    const from = this.currentState;
    const allowed = this.transitions[from];

    if (!allowed || !allowed.includes(to)) {
      const allowedStr = allowed && allowed.length > 0 ? allowed.join(', ') : 'none';
      throw new Error(
        `Invalid state transition: Cannot transition from "${from}" to "${to}". Allowed transitions from "${from}": [${allowedStr}].`,
      );
    }

    if (this.bus) {
      // 1. Emit exit for previous state
      this.exitPayload.state = from;
      this.exitPayload.to = to;
      this.bus.emit(this.exitEvent, this.exitPayload);
    }

    // 2. Advance state
    this.currentState = to;

    if (this.bus) {
      // 3. Emit enter for new state
      this.enterPayload.state = to;
      this.enterPayload.from = from;
      this.bus.emit(this.enterEvent, this.enterPayload);

      // 4. Emit change
      this.changePayload.from = from;
      this.changePayload.to = to;
      this.bus.emit(this.changeEvent, this.changePayload);
    }
  }
}
