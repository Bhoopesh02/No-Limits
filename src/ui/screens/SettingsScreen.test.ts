import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GraphicsService } from '../../services/GraphicsService';
import { SettingsService } from '../../services/SettingsService';
import { SettingsScreen } from './SettingsScreen';

interface MockDomElement {
  tagName: string;
  id: string;
  className: string;
  textContent: string;
  innerHTML: string;
  style: Record<string, string>;
  attributes: Record<string, string>;
  children: MockDomElement[];
  classList: {
    add: (...c: string[]) => void;
    remove: (...c: string[]) => void;
    contains: (c: string) => boolean;
  };
  setAttribute: (k: string, v: string) => void;
  removeAttribute: (k: string) => void;
  getAttribute: (k: string) => string | null;
  contains: (child: MockDomElement) => boolean;
  appendChild: (child: MockDomElement) => void;
  remove: () => void;
  focus: () => void;
  addEventListener: (event: string, handler: EventListener) => void;
  removeEventListener: (event: string, handler: EventListener) => void;
  querySelector: (sel: string) => MockDomElement | null;
  querySelectorAll: (sel: string) => MockDomElement[];
}

function createMockDomElement(tag = 'div'): MockDomElement {
  const children: MockDomElement[] = [];
  const classes = new Set<string>();
  const attributes: Record<string, string> = {};

  const el: MockDomElement = {
    tagName: tag.toUpperCase(),
    id: '',
    className: '',
    textContent: '',
    innerHTML: '',
    style: {},
    attributes,
    children,
    classList: {
      add: (...c: string[]) => c.forEach((cls) => classes.add(cls)),
      remove: (...c: string[]) => c.forEach((cls) => classes.delete(cls)),
      contains: (c: string) => classes.has(c),
    },
    setAttribute: (k: string, v: string) => {
      attributes[k] = v;
      if (k === 'id') el.id = v;
    },
    removeAttribute: (k: string) => {
      delete attributes[k];
      if (k === 'id') el.id = '';
    },
    getAttribute: (k: string) => attributes[k] ?? null,
    contains: (child: MockDomElement) => children.includes(child),
    appendChild: (child: MockDomElement) => children.push(child),
    remove: () => {},
    focus: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
  };

  return el;
}

describe('SettingsScreen', () => {
  const originalDocument = globalThis.document;
  const originalRaf = globalThis.requestAnimationFrame;
  const originalWindow = (globalThis as unknown as { window?: unknown }).window;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = globalThis;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).document = {
      createElement: (tag: string) => createMockDomElement(tag),
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      body: createMockDomElement('body'),
      activeElement: null,
    };
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).document = originalDocument;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).requestAnimationFrame = originalRaf;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = originalWindow;
  });

  it('creates modal with tabs and controls', () => {
    const settingsService = new SettingsService();
    const graphicsService = new GraphicsService();

    const screen = new SettingsScreen({
      settingsService,
      graphicsService,
    });

    expect(screen.modal).toBeDefined();
    expect(screen.modal.id).toBe('nl-settings-modal');
  });

  it('opens and closes modal cleanly', () => {
    const settingsService = new SettingsService();
    const graphicsService = new GraphicsService();
    const onClose = vi.fn();

    const screen = new SettingsScreen({
      settingsService,
      graphicsService,
      onClose,
    });

    screen.open();
    screen.close();
    expect(onClose).toHaveBeenCalled();
  });
});
