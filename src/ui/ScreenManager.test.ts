import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EventBus } from '../core/EventBus';
import type { GameEvents } from '../data/GameEvents';
import type { Screen } from './screens/Screen';
import { ScreenManager } from './ScreenManager';

interface MockElement {
  tagName: string;
  className: string;
  style: Record<string, string>;
  children: MockElement[];
  innerHTML: string;
  focused: boolean;
  clicked: boolean;
  classList: {
    add: (c: string) => void;
    remove: (c: string) => void;
    contains: (c: string) => boolean;
  };
  appendChild: (child: MockElement) => void;
  remove: () => void;
  focus: () => void;
  click: () => void;
  querySelectorAll: (selector: string) => MockElement[];
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
    focused: false,
    clicked: false,
    classList: {
      add: (c: string) => classes.add(c),
      remove: (c: string) => classes.delete(c),
      contains: (c: string) => classes.has(c),
    },
    appendChild: (child: MockElement) => children.push(child),
    remove: () => {},
    focus: () => {
      el.focused = true;
    },
    click: () => {
      el.clicked = true;
    },
    querySelectorAll: () => [],
  };
  return el;
}

describe('ScreenManager', () => {
  const originalDocument = globalThis.document;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).document = {
      createElement: (tag: string) => createMockElement(tag),
      querySelector: () => null,
      querySelectorAll: () => [],
      body: createMockElement('body'),
      activeElement: null,
    };
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).document = originalDocument;
  });

  it('switches screens when state changes', () => {
    const bus = new EventBus<GameEvents>();
    const uiRoot = createMockElement('div');

    const sm = new ScreenManager({
      uiRoot: uiRoot as unknown as HTMLElement,
      bus,
    });

    let bootEntered = false;
    let menuEntered = false;

    const mockBootScreen: Screen = {
      id: 'Boot',
      element: createMockElement('div') as unknown as HTMLElement,
      onEnter: () => {
        bootEntered = true;
      },
    };

    const mockMenuScreen: Screen = {
      id: 'Menu',
      element: createMockElement('div') as unknown as HTMLElement,
      onEnter: () => {
        menuEntered = true;
      },
    };

    sm.registerScreen('Boot', mockBootScreen);
    sm.registerScreen('Menu', mockMenuScreen);

    // Enter Boot
    bus.emit('state:enter', { state: 'Boot' });
    expect(sm.getActiveScreen()?.id).toBe('Boot');
    expect(bootEntered).toBe(true);

    // Enter Menu
    bus.emit('state:exit', { state: 'Boot', to: 'Menu' });
    bus.emit('state:enter', { state: 'Menu', from: 'Boot' });
    expect(sm.getActiveScreen()?.id).toBe('Menu');
    expect(menuEntered).toBe(true);

    sm.dispose();
  });
});
