import { formatLapTime } from '../core/formatLapTime';
import type { OpponentDriver } from '../data/OpponentRoster';
import type { ClassificationEntry } from '../data/RaceResult';
import type { LapTimer } from './LapTimer';
import type { Standings } from './Standings';

/**
 * Builds the official race classification table from current standings and lap timers.
 *
 * Rules:
 * - 1st place displays total elapsed finish time or running lap time.
 * - Finished runners-up display the time gap to the leader (+0:01.420).
 * - Running (unfinished) cars display the physical distance gap in meters (+45m).
 */
export function buildClassification(
  standings: Standings,
  lapTimers: readonly LapTimer[],
  roster: readonly OpponentDriver[],
  playerCarIndex = 5,
  totalTimeMs = 0,
): readonly ClassificationEntry[] {
  const orderedIndices = standings.getOrderedCarIndices();
  const leaderIndex = orderedIndices[0];
  const leaderFinished = standings.hasFinished(leaderIndex);
  const leaderProgress = standings.getProgress(leaderIndex);

  const entries: ClassificationEntry[] = [];

  for (let rank = 0; rank < orderedIndices.length; rank++) {
    const carIndex = orderedIndices[rank];
    const isPlayer = carIndex === playerCarIndex;
    const driverName = isPlayer
      ? 'Player'
      : (roster[carIndex]?.displayName ?? `Driver ${carIndex}`);
    const finished = standings.hasFinished(carIndex);
    const carTimer = lapTimers[carIndex];
    const carProgress = standings.getProgress(carIndex);
    const gapMeters = Math.max(0, leaderProgress - carProgress);

    let carTotalTimeMs: number | null = null;
    let formattedTimeOrGap = '';

    if (finished) {
      // Finished car: total time from sum of completed laps
      const lapTimes = carTimer.getLapTimes();
      carTotalTimeMs = lapTimes.reduce((a, b) => a + b, 0);
      if (carTotalTimeMs <= 0) {
        carTotalTimeMs = totalTimeMs;
      }
    }

    if (rank === 0) {
      // Race Leader
      formattedTimeOrGap =
        finished && carTotalTimeMs !== null ? formatLapTime(carTotalTimeMs) : 'LEADER';
    } else {
      // Runner up
      if (finished && leaderFinished) {
        const leaderLapTimes = lapTimers[leaderIndex].getLapTimes();
        const leaderTime = leaderLapTimes.reduce((a, b) => a + b, 0) || totalTimeMs;
        const diffMs = Math.max(0, (carTotalTimeMs ?? totalTimeMs) - leaderTime);
        formattedTimeOrGap = `+${formatLapTime(diffMs)}`;
      } else {
        formattedTimeOrGap = `+${Math.round(gapMeters)}m`;
      }
    }

    entries.push({
      position: rank + 1,
      driverName,
      isPlayer,
      finished,
      totalTimeMs: carTotalTimeMs,
      gapMeters,
      formattedTimeOrGap,
    });
  }

  return entries;
}
