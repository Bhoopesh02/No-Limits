import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RaceHud } from './RaceHud';

interface MockDomNode {
  tagName: string;
  className: string;
  style: Record<string, string>;
  children: MockDomNode[];
  innerHTML: string;
  textContent: string;
  classList: {
    add: (c: string) => void;
    remove: (c: string) => void;
    contains: (c: string) => boolean;
  };
  appendChild: (child: MockDomNode) => void;
  remove: () => void;
  contains: (child: MockDomNode) => boolean;
  addEventListener: (event: string, handler: (e: unknown) => void) => void;
  removeEventListener: (event: string, handler: (e: unknown) => void) => void;
  setAttribute: (key: string, val: string) => void;
  click: () => void;
}

function createMockDomNode(tag = 'div'): MockDomNode {
  const children: MockDomNode[] = [];
  const classes = new Set<string>();
  const listeners = new Map<string, ((e: unknown) => void)[]>();

  const node: MockDomNode = {
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
    appendChild: (child: MockDomNode) => children.push(child),
    remove: () => {},
    contains: (child: MockDomNode) => children.includes(child),
    addEventListener: (event: string, handler: (e: unknown) => void) => {
      const list = listeners.get(event) ?? [];
      list.push(handler);
      listeners.set(event, list);
    },
    removeEventListener: (event: string, handler: (e: unknown) => void) => {
      const list = listeners.get(event);
      if (!list) return;
      const idx = list.indexOf(handler);
      if (idx !== -1) list.splice(idx, 1);
    },
    setAttribute: () => {},
    click: () => {
      const list = listeners.get('click') ?? [];
      for (const h of list) {
        h({ stopPropagation: () => {}, preventDefault: () => {} });
      }
    },
  };
  return node;
}

describe('RaceHud', () => {
  const originalDocument = globalThis.document;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).document = {
      createElement: (tag: string) => createMockDomNode(tag),
      body: createMockDomNode('body'),
    };
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).document = originalDocument;
  });

  it('initializes desktop layout correctly when isTouch is false', () => {
    const root = createMockDomNode('div') as unknown as HTMLElement;
    const hud = new RaceHud({
      uiRoot: root,
      isTouch: false,
      totalLaps: 3,
      totalRacers: 6,
    });

    // Toggle layout to touch and back to verify layout switcher
    hud.layout(true);
    hud.layout(false);

    hud.dispose();
  });

  it('switches to mobile layout when isTouch is true and triggers pause callback', () => {
    const root = createMockDomNode('div') as unknown as HTMLElement;
    const onPause = vi.fn();

    const hud = new RaceHud({
      uiRoot: root,
      isTouch: true,
      totalLaps: 3,
      totalRacers: 6,
      onPause,
    });

    // Trigger pause via mock button
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pauseBtn = (hud as any).pauseBtn as MockDomNode;
    expect(pauseBtn).toBeDefined();
    pauseBtn.click();
    expect(onPause).toHaveBeenCalledTimes(1);

    hud.dispose();
  });

  it('updates readouts without errors', () => {
    const root = createMockDomNode('div') as unknown as HTMLElement;
    const hud = new RaceHud({
      uiRoot: root,
      isTouch: true,
      totalLaps: 3,
      totalRacers: 6,
    });

    expect(() => {
      hud.update({
        speedKmh: 185,
        isReversing: false,
        nitroAmount: 0.8,
        nitroActiveTime: 0,
        isDrifting: true,
        driftScore: 450,
        driftMultiplier: 1.5,
        position: 1,
        totalRacers: 6,
        currentLap: 2,
        totalLaps: 3,
        currentLapTimeMs: 42150,
        lastLapTimeMs: 41200,
        bestLapTimeMs: 41200,
        countdownDisplay: 'GO',
      });
    }).not.toThrow();

    expect(() => hud.reset(1, 3, 6)).not.toThrow();
    hud.dispose();
  });
});
