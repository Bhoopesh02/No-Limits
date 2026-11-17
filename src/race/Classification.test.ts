import { describe, expect, it } from 'vitest';
import { OPPONENT_ROSTER } from '../data/OpponentRoster';
import { buildClassification } from './Classification';
import { LapTimer } from './LapTimer';
import { Standings } from './Standings';

describe('buildClassification', () => {
  it('formats classification correctly for a mix of finished and running cars', () => {
    const trackLength = 1000;
    const standings = new Standings(trackLength, 6);
    const lapTimers = [
      new LapTimer(trackLength, 1),
      new LapTimer(trackLength, 1),
      new LapTimer(trackLength, 1),
      new LapTimer(trackLength, 1),
      new LapTimer(trackLength, 1),
      new LapTimer(trackLength, 1),
    ];

    standings.reset([1000, 1000, 950, 900, 850, 800]);

    // Car 0 finished first at step 1000
    standings.recordFinish(0, 1000);
    // Car 1 finished second at step 1060
    standings.recordFinish(1, 1060);

    standings.sort();

    const classification = buildClassification(standings, lapTimers, OPPONENT_ROSTER, 5, 60000);

    expect(classification.length).toBe(6);

    // Leader (Car 0)
    expect(classification[0].position).toBe(1);
    expect(classification[0].driverName).toBe(OPPONENT_ROSTER[0].displayName);
    expect(classification[0].finished).toBe(true);

    // 2nd Place (Car 1)
    expect(classification[1].position).toBe(2);
    expect(classification[1].driverName).toBe(OPPONENT_ROSTER[1].displayName);
    expect(classification[1].finished).toBe(true);

    // 6th Place (Player: car 5)
    expect(classification[5].position).toBe(6);
    expect(classification[5].driverName).toBe('Player');
    expect(classification[5].isPlayer).toBe(true);
    expect(classification[5].finished).toBe(false);
    expect(classification[5].formattedTimeOrGap).toBe('+200m'); // 1000m - 800m
  });

  it.each([3, 4, 5])('formats classification correctly for %i opponents', (opponentCount) => {
    const totalRacers = opponentCount + 1;
    const playerIndex = opponentCount;
    const trackLength = 1000;
    const standings = new Standings(trackLength, totalRacers);
    const lapTimers = Array.from({ length: totalRacers }, () => new LapTimer(trackLength, 1));

    const initialDistances = Array.from({ length: totalRacers }, (_, i) => 1000 - i * 50);
    standings.reset(initialDistances);
    standings.sort();

    const classification = buildClassification(
      standings,
      lapTimers,
      OPPONENT_ROSTER,
      playerIndex,
      30000,
    );

    expect(classification.length).toBe(totalRacers);
    const playerEntry = classification.find((e) => e.isPlayer);
    expect(playerEntry).toBeDefined();
    expect(playerEntry?.driverName).toBe('Player');
  });
});
