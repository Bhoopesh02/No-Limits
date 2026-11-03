export type GameState = 'Boot' | 'Menu' | 'Loading' | 'Race' | 'Results';

export const GAME_STATE_TRANSITIONS: Readonly<Record<GameState, readonly GameState[]>> = {
  Boot: ['Menu'],
  Menu: ['Loading'],
  Loading: ['Race'],
  Race: ['Results', 'Menu', 'Loading'],
  Results: ['Menu', 'Loading'],
} as const;
