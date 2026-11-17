import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import trackJson from '../../public/assets/tracks/coastal-highway/data/track-coastal-highway.json';
import { AiDriver } from '../ai/AiDriver';
import { RacingLine } from '../ai/RacingLine';
import { EventBus } from '../core/EventBus';
import { DEFAULT_CAR_KAZE } from '../data/CarData';
import type { GameEvents } from '../data/GameEvents';
import type { TrackData } from '../data/TrackData';
import { Spline } from '../race/Spline';
import { CarFactory } from '../render/car/CarFactory';
import { RaceSession } from './RaceSession';

interface MockElement {
  tagName: string;
  className: string;
  style: Record<string, string>;
  children: MockElement[];
  innerHTML: string;
  classList: {
    add: (c: string) => void;
    remove: (c: string) => void;
    contains: (c: string) => boolean;
  };
  appendChild: (child: MockElement) => void;
  remove: () => void;
  setAttribute: (k: string, v: string) => void;
  getAttribute: (k: string) => string | null;
}

function createMockElement(tag = 'div'): MockElement {
  const children: MockElement[] = [];
  const classes = new Set<string>();
  const el: MockElement = {
    tagName: tag.toUpperCase(),
    className: '',
    style: {},
    children,
    innerHTML: '',
    classList: {
      add: (c: string) => classes.add(c),
      remove: (c: string) => classes.delete(c),
      contains: (c: string) => classes.has(c),
    },
    appendChild: (child: MockElement) => children.push(child),
    remove: () => {},
    setAttribute: () => {},
    getAttribute: () => null,
  };
  return el;
}

describe('Variable-car Race Integration Tests (N = 3, 4, 5 opponents)', () => {
  const originalDocument = globalThis.document;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).document = {
      createElement: (tag: string) => createMockElement(tag),
      querySelector: () => null,
      querySelectorAll: () => [],
      body: createMockElement('body'),
    };
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).document = originalDocument;
  });

  function simulateRaceWithOpponents(opponentCount: number) {
    const totalRacers = opponentCount + 1;

    const trackData: TrackData = {
      id: trackJson.id,
      displayName: trackJson.displayName,
      laps: 1, // 1 lap for fast, deterministic integration test
      checkpointCount: trackJson.checkpointCount,
      lengthMeters: trackJson.lengthMeters,
      scenery: trackJson.scenery,
      timeOfDayStart: trackJson.timeOfDayStart,
      controlPoints: trackJson.controlPoints,
    };

    const spline = new Spline(trackData.controlPoints, 1.0);
    const carFactory = new CarFactory();

    const sceneChildren: unknown[] = [];
    const mockRenderer = {
      scene: {
        add: (obj: unknown) => sceneChildren.push(obj),
        remove: (obj: unknown) => {
          const idx = sceneChildren.indexOf(obj);
          if (idx !== -1) sceneChildren.splice(idx, 1);
        },
      },
      camera: { position: { set: () => {} }, lookAt: () => {} },
      getAspect: () => 1.77,
    };

    const mockCameraRig = {
      teleport: () => {},
      update: () => {},
    };

    let playerTelemetry = {
      x: 0,
      z: 0,
      heading: 0,
      speed: 0,
      lateralSpeed: 0,
    };

    const mockCarView = {
      getPosition: () => ({ x: playerTelemetry.x, y: 0, z: playerTelemetry.z }),
      getHeading: () => playerTelemetry.heading,
      update: (
        _prev: unknown,
        curr: { x: number; z: number; heading: number; speed: number; lateralSpeed: number },
      ) => {
        playerTelemetry = curr;
      },
      getRoot: () => ({ id: 'player-view' }),
      dispose: () => {},
    };

    const mockTrackView = {
      group: { id: 'track-view-group' },
      dispose: () => {},
    };

    const uiRoot = createMockElement('div');
    const bus = new EventBus<GameEvents>();

    let raceFinishedResult: unknown = null;
    bus.on('race:finished', (res) => {
      raceFinishedResult = res;
    });

    const session = new RaceSession({
      renderer: mockRenderer as never,
      cameraRig: mockCameraRig as never,
      carView: mockCarView as never,
      carFactory,
      playerDetail: 'low',
      opponentCount,
      trackData,
      carData: DEFAULT_CAR_KAZE,
      spline,
      trackView: mockTrackView as never,
      bus,
      uiRoot: uiRoot as never,
      isTouch: false,
    });

    const racingLine = new RacingLine(spline, DEFAULT_CAR_KAZE.topSpeed);
    const playerDriver = new AiDriver({
      driver: {
        id: 'player-bot',
        displayName: 'Player Bot',
        paintColor: '#3DA5FF',
        skill: 0.94,
        lineBias: 0.0,
        seedOffset: 42,
        carData: DEFAULT_CAR_KAZE,
      },
      racingLine,
      initialDistance: 0,
    });

    const fixedDt = 1 / 60;
    const maxSteps = 4500;

    const standings = session.getStandings();
    const raceController = session.getRaceController();

    session.render(1.0, fixedDt);

    for (let step = 0; step < maxSteps; step++) {
      const phase = raceController.getPhase();

      const playerInput = playerDriver.update(
        playerTelemetry,
        playerDriver.getDistanceAlongTrack(),
        phase,
        fixedDt,
        0.95,
      );

      session.simulate(fixedDt, playerInput);
      session.render(1.0, fixedDt);

      const seenRanks = new Set<number>();
      for (let car = 0; car < totalRacers; car++) {
        const rank = standings.positionOf(car);
        expect(rank).toBeGreaterThanOrEqual(1);
        expect(rank).toBeLessThanOrEqual(totalRacers);
        expect(seenRanks.has(rank)).toBe(false);
        seenRanks.add(rank);
      }

      if (phase === 'Finished' && raceFinishedResult !== null) {
        let allCarsFinished = true;
        for (let car = 0; car < totalRacers; car++) {
          if (!standings.hasFinished(car)) {
            allCarsFinished = false;
            break;
          }
        }
        if (allCarsFinished) {
          break;
        }
      }
    }

    expect(raceFinishedResult).not.toBeNull();
    const result = raceController.getResult();
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.totalRacers).toBe(totalRacers);
    expect(result.classification).toHaveLength(totalRacers);

    for (let i = 0; i < totalRacers; i++) {
      const entry = result.classification[i];
      expect(entry.position).toBe(i + 1);
      if (i === 0) {
        expect(entry.formattedTimeOrGap).toContain(':');
      }
    }

    const playerEntry = result.classification.find((e) => e.isPlayer);
    expect(playerEntry).toBeDefined();
    expect(playerEntry?.position).toBe(result.position);

    const firstCarStep = standings.getFinishStep(standings.getCarAtRank(0));
    const lastCarStep = standings.getFinishStep(standings.getCarAtRank(totalRacers - 1));

    expect(Number.isFinite(firstCarStep)).toBe(true);
    expect(Number.isFinite(lastCarStep)).toBe(true);
    expect(firstCarStep).toBeLessThan(lastCarStep);
    expect(lastCarStep - firstCarStep).toBeLessThan(900);

    session.dispose();
    carFactory.dispose();
  }

  it('simulates a 3-opponent race (4 cars) to completion with valid standings and classification', () => {
    simulateRaceWithOpponents(3);
  });

  it('simulates a 4-opponent race (5 cars) to completion with valid standings and classification', () => {
    simulateRaceWithOpponents(4);
  });

  it('simulates a 5-opponent race (6 cars) to completion with valid standings and classification', () => {
    simulateRaceWithOpponents(5);
  });
});
