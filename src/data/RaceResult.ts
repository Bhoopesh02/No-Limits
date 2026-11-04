export type RacePhase = 'Countdown' | 'Running' | 'Finished';

export interface ClassificationEntry {
  readonly position: number; // 1-based rank (1 to 6)
  readonly driverName: string;
  readonly isPlayer: boolean;
  readonly finished: boolean;
  readonly totalTimeMs: number | null; // milliseconds if finished, null otherwise
  readonly gapMeters: number; // gap in meters behind leader (0 for 1st place)
  readonly formattedTimeOrGap: string; // e.g. "1:42.512", "+32m", "DNF"
}

export interface RaceResult {
  readonly totalTimeMs: number;
  readonly lapTimesMs: readonly number[];
  readonly bestLapTimeMs: number;
  readonly lapsCompleted: number;
  readonly position: number;
  readonly totalRacers: number;
  readonly classification: readonly ClassificationEntry[];
}
