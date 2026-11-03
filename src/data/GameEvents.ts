import type { GameState } from './GameState';
import type { RacePhase, RaceResult } from './RaceResult';

export type MenuNavigationAction = 'up' | 'down' | 'confirm' | 'back';

export interface StateEnterPayload<TState extends string = GameState> {
  state: TState;
  from?: TState;
}

export interface StateExitPayload<TState extends string = GameState> {
  state: TState;
  to: TState;
}

export interface StateChangePayload<TState extends string = GameState> {
  from: TState;
  to: TState;
}

export interface RaceLapPayload {
  lap: number;
  totalLaps: number;
  lapTimeMs: number;
  bestLapTimeMs: number | null;
}

export interface RacePhasePayload {
  phase: RacePhase;
  previous: RacePhase;
}

export interface CountdownPayload {
  count: number | 'GO';
}

export interface GameEvents {
  'state:enter': StateEnterPayload<GameState>;
  'state:exit': StateExitPayload<GameState>;
  'state:change': StateChangePayload<GameState>;

  'race:phase': RacePhasePayload;
  'race:countdown': CountdownPayload;
  'race:lap': RaceLapPayload;
  'race:finished': RaceResult;
  'race:pause': boolean;

  'menu:navigate': MenuNavigationAction;
}
