import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EventBus } from '../core/EventBus';
import { DEFAULT_CAR_KAZE } from '../data/CarData';
import type { GameEvents } from '../data/GameEvents';
import { TrackData } from '../data/TrackData';
import { Spline } from '../race/Spline';
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

describe('RaceSession lifecycle and disposal', () => {
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

  const dummyTrackData: TrackData = {
    id: 'test-track',
    displayName: 'Test Track',
    laps: 3,
    checkpointCount: 4,
    lengthMeters: 1000,
    scenery: 'coastal',
    timeOfDayStart: 12,
    controlPoints: [
      { x: 0, y: 0, z: 0, width: 12 },
      { x: 250, y: 0, z: 0, width: 12 },
      { x: 250, y: 0, z: 250, width: 12 },
      { x: 0, y: 0, z: 250, width: 12 },
    ],
  };

  it('fully disposes track view and HUD elements on restart/rebuild cycle', () => {
    let trackViewDisposedCount = 0;
    const sceneChildren: unknown[] = [];

    const mockTrackView = {
      group: { id: 'track-group' },
      dispose: () => {
        trackViewDisposedCount++;
      },
    };

    const mockScene = {
      add: (obj: unknown) => {
        sceneChildren.push(obj);
      },
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

    const mockCarView = {
      getPosition: () => ({ x: 0, y: 0, z: 0 }),
      getHeading: () => 0,
      update: () => {},
    };

    const uiRoot = createMockElement('div');

    const bus = new EventBus<GameEvents>();
    const spline = new Spline(dummyTrackData.controlPoints, 1.0);

    // Simulate 5 restarts
    for (let i = 0; i < 5; i++) {
      const session = new RaceSession({
        renderer: mockRenderer as never,
        cameraRig: mockCameraRig as never,
        carView: mockCarView as never,
        trackData: dummyTrackData,
        carData: DEFAULT_CAR_KAZE,
        spline,
        trackView: mockTrackView as never,
        bus,
        uiRoot: uiRoot as never,
        isTouch: false,
      });

      expect(sceneChildren).toContain(mockTrackView.group);
      session.dispose();
      expect(sceneChildren).not.toContain(mockTrackView.group);
    }

    expect(trackViewDisposedCount).toBe(5);
  });
});
