export type RacePhase = 'Countdown' | 'Running' | 'Finished';

export interface RaceResult {
  readonly totalTimeMs: number;
  readonly lapTimesMs: readonly number[];
  readonly bestLapTimeMs: number;
  readonly lapsCompleted: number;
  readonly position: number;
}
