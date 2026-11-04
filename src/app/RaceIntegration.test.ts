import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import rawTrack from '../../public/assets/tracks/coastal-highway/data/track-coastal-highway.json';
import { AiDriver } from '../ai/AiDriver';
import { RacingLine } from '../ai/RacingLine';
import { EventBus } from '../core/EventBus';
import { DEFAULT_CAR_KAZE } from '../data/CarData';
import type { GameEvents } from '../data/GameEvents';
import type { TrackControlPoint, TrackData } from '../data/TrackData';
import { Spline } from '../race/Spline';
import { CarFactory } from '../render/car/CarFactory';
import { RaceSession } from './RaceSession';

interface MockElement {
  tagName: string;
  className: string;
  style: Record<string, string>;
  children: MockElement[];
  innerHTML: string;
  textContent: string;
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
    textContent: '',
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

describe('Full 6-car Race Integration Test', () => {
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

  it('simulates a 6-car race to completion with valid standings, classification, and no NaNs', () => {
    // 1. Configure a 1-lap race to keep headless test execution snappy while testing full lifecycle
    const trackData: TrackData = {
      id: rawTrack.id,
      displayName: rawTrack.displayName,
      laps: 1,
      checkpointCount: rawTrack.checkpointCount ?? 16,
      lengthMeters: rawTrack.lengthMeters ?? 2478,
      scenery: rawTrack.scenery ?? 'coastal',
      timeOfDayStart: 12,
      controlPoints: rawTrack.controlPoints as TrackControlPoint[],
    };

    const spline = new Spline(trackData.controlPoints, 1.0);
    const carFactory = new CarFactory();

    const sceneChildren: unknown[] = [];
    const mockScene = {
      add: (obj: unknown) => sceneChildren.push(obj),
      remove: (obj: unknown) => {
        const idx = sceneChildren.indexOf(obj);
        if (idx !== -1) sceneChildren.splice(idx, 1);
      },
    };

    const mockRenderer = {
      scene: mockScene,
      camera: { position: { set: () => {} }, lookAt: () => {} },
      getAspect: () => 1.77,
    };

    const mockCameraRig = {
      teleport: () => {},
      update: () => {},
    };

    let playerTelemetry: {
      x: number;
      z: number;
      heading: number;
      speed: number;
      lateralSpeed: number;
    } = {
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
      playerDetail: 'medium',
      trackData,
      carData: DEFAULT_CAR_KAZE,
      spline,
      trackView: mockTrackView as never,
      bus,
      uiRoot: uiRoot as never,
      isTouch: false,
    });

    // Scripted player driver along the racing line with ~92% throttle
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
    const maxSteps = 4500; // 75 seconds (1 lap takes ~50s)

    const standings = session.getStandings();
    const raceController = session.getRaceController();

    // Initial render to seed playerTelemetry
    session.render(1.0, fixedDt);

    // 2. Step simulation until finished or timeout
    for (let step = 0; step < maxSteps; step++) {
      const phase = raceController.getPhase();

      // Scripted input for player using updated telemetry
      const playerInput = playerDriver.update(
        playerTelemetry,
        playerDriver.getDistanceAlongTrack(),
        phase,
        fixedDt,
        0.95,
      );

      session.simulate(fixedDt, playerInput);
      session.render(1.0, fixedDt);

      // Verify standings uniqueness at every step: no duplicate ranks
      const seenRanks = new Set<number>();
      for (let car = 0; car < 6; car++) {
        const rank = standings.positionOf(car);
        expect(rank).toBeGreaterThanOrEqual(1);
        expect(rank).toBeLessThanOrEqual(6);
        expect(seenRanks.has(rank)).toBe(false);
        seenRanks.add(rank);
      }

      if (phase === 'Finished' && raceFinishedResult !== null) {
        // Player has finished; give remaining cars a few seconds to cross the line
        let allCarsFinished = true;
        for (let car = 0; car < 6; car++) {
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

    // 3. Assertions
    expect(raceFinishedResult).not.toBeNull();
    const result = raceController.getResult();
    expect(result).not.toBeNull();
    if (!result) return;

    // A. Total racers
    expect(result.totalRacers).toBe(6);

    // B. Classification table has 6 rows
    expect(result.classification).toHaveLength(6);

    // C. Verify classification ordering matches positions (1 to 6)
    for (let i = 0; i < 6; i++) {
      const entry = result.classification[i];
      expect(entry.position).toBe(i + 1);
      // Winner has total time formatted
      if (i === 0) {
        expect(entry.formattedTimeOrGap).toContain(':');
      }
    }

    // D. Player entry exists and is highlighted
    const playerEntry = result.classification.find((e) => e.isPlayer);
    expect(playerEntry).toBeDefined();
    expect(playerEntry?.position).toBe(result.position);

    // E. Verify all cars finished and finish steps are spread across a plausible window
    const firstCarStep = standings.getFinishStep(standings.getCarAtRank(0));
    const lastCarStep = standings.getFinishStep(standings.getCarAtRank(5));

    expect(Number.isFinite(firstCarStep)).toBe(true);
    expect(Number.isFinite(lastCarStep)).toBe(true);
    // Winner and last place must not finish at the identical simulation step
    expect(firstCarStep).toBeLessThan(lastCarStep);
    // Winner and last car finish within a plausible window (~15 seconds = 900 steps)
    expect(lastCarStep - firstCarStep).toBeLessThan(900);

    // Clean disposal
    session.dispose();
    carFactory.dispose();
  });
});
