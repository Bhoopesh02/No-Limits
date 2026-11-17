import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTouchControlState } from '../../data/TouchControlState';
import {
  createTouchControls,
  isPointInBounds,
  shouldShowTouchControlsGiven,
} from './TouchControls';

interface MockDomNode {
  tagName: string;
  className: string;
  style: Record<string, string>;
  children: MockDomNode[];
  parentElement: MockDomNode | null;
  classList: {
    add: (c: string) => void;
    remove: (c: string) => void;
    toggle: (c: string, force?: boolean) => boolean;
    contains: (c: string) => boolean;
  };
  appendChild: (child: MockDomNode) => void;
  insertBefore: (child: MockDomNode, ref: MockDomNode | null) => MockDomNode;
  remove: () => void;
  removeChild: (child: MockDomNode) => void;
  addEventListener: (event: string, handler: (e: unknown) => void) => void;
  removeEventListener: (event: string, handler: (e: unknown) => void) => void;
  setAttribute: (key: string, val: string) => void;
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
    parentElement: null,
    classList: {
      add: (c: string) => classes.add(c),
      remove: (c: string) => classes.delete(c),
      toggle: (c: string, force?: boolean) => {
        const shouldAdd = force !== undefined ? force : !classes.has(c);
        if (shouldAdd) classes.add(c);
        else classes.delete(c);
        return classes.has(c);
      },
      contains: (c: string) => classes.has(c),
    },
    appendChild: (child: MockDomNode) => {
      if (child.parentElement) {
        child.parentElement.removeChild(child);
      }
      child.parentElement = node;
      children.push(child);
    },
    insertBefore: (child: MockDomNode, ref: MockDomNode | null) => {
      if (child.parentElement) {
        child.parentElement.removeChild(child);
      }
      child.parentElement = node;
      const idx = ref ? children.indexOf(ref) : -1;
      if (idx !== -1) children.splice(idx, 0, child);
      else children.push(child);
      return child;
    },
    remove: () => {
      if (node.parentElement) {
        node.parentElement.removeChild(node);
      }
    },
    removeChild: (child: MockDomNode) => {
      const idx = children.indexOf(child);
      if (idx !== -1) {
        children.splice(idx, 1);
        child.parentElement = null;
      }
    },
    addEventListener: (event: string, handler: (e: unknown) => void) => {
      const list = listeners.get(event) ?? [];
      list.push(handler);
      listeners.set(event, list);
    },
    removeEventListener: (event: string, handler: (e: unknown) => void) => {
      const list = listeners.get(event) ?? [];
      const idx = list.indexOf(handler);
      if (idx !== -1) list.splice(idx, 1);
    },
    setAttribute: () => {},
  };

  return node;
}

describe('TouchControls pure logic', () => {
  describe('isPointInBounds', () => {
    const bounds = { left: 100, right: 200, top: 50, bottom: 150 };

    it('returns true when point is inside bounds', () => {
      expect(isPointInBounds(150, 100, bounds)).toBe(true);
    });

    it('returns true on exact boundary edges', () => {
      expect(isPointInBounds(100, 50, bounds)).toBe(true);
      expect(isPointInBounds(200, 150, bounds)).toBe(true);
      expect(isPointInBounds(100, 150, bounds)).toBe(true);
      expect(isPointInBounds(200, 50, bounds)).toBe(true);
    });

    it('returns false when point is outside bounds in any direction', () => {
      expect(isPointInBounds(99, 100, bounds)).toBe(false); // left
      expect(isPointInBounds(201, 100, bounds)).toBe(false); // right
      expect(isPointInBounds(150, 49, bounds)).toBe(false); // top
      expect(isPointInBounds(150, 151, bounds)).toBe(false); // bottom
    });
  });

  describe('shouldShowTouchControlsGiven', () => {
    it('returns true when ?touch=1 is present in URL search', () => {
      expect(shouldShowTouchControlsGiven('?touch=1', false)).toBe(true);
      expect(shouldShowTouchControlsGiven('?track=coastal&touch=1&debug=true', false)).toBe(true);
    });

    it('returns false when desktop/fine pointer and ?touch=1 is not set', () => {
      expect(shouldShowTouchControlsGiven('', false)).toBe(false);
      expect(shouldShowTouchControlsGiven('?touch=0', false)).toBe(false);
      expect(shouldShowTouchControlsGiven('?other=1', false)).toBe(false);
    });

    it('returns true when pointer is coarse (touch device) without query parameter', () => {
      expect(shouldShowTouchControlsGiven('', true)).toBe(true);
    });
  });

  describe('createTouchControls and setLayout', () => {
    const origDocument = globalThis.document;

    beforeEach(() => {
      globalThis.document = {
        createElement: (tag: string) => createMockDomNode(tag),
      } as unknown as Document;
    });

    afterEach(() => {
      globalThis.document = origDocument;
    });

    it('initializes with default layout and toggles steering side and nitro side', () => {
      const state = createTouchControlState();
      const controls = createTouchControls(state);

      expect(controls.classList.contains('is-steer-right')).toBe(false);
      expect(controls.classList.contains('is-nitro-with-steer')).toBe(false);

      // Change steer to right
      controls.setLayout('right', 'pedals');
      expect(controls.classList.contains('is-steer-right')).toBe(true);
      expect(controls.classList.contains('is-nitro-with-steer')).toBe(false);

      // Change nitro to steer side
      controls.setLayout('left', 'steer');
      expect(controls.classList.contains('is-steer-right')).toBe(false);
      expect(controls.classList.contains('is-nitro-with-steer')).toBe(true);

      // Change both to right and steer
      controls.setLayout('right', 'steer');
      expect(controls.classList.contains('is-steer-right')).toBe(true);
      expect(controls.classList.contains('is-nitro-with-steer')).toBe(true);

      // Clean up
      controls.dispose();
    });
  });
});
