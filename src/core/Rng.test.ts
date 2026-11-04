import { describe, expect, it } from 'vitest';
import { Rng } from './Rng';

describe('Rng', () => {
  it('produces deterministic numbers from identical seeds', () => {
    const rng1 = new Rng(42);
    const rng2 = new Rng(42);

    for (let i = 0; i < 100; i++) {
      expect(rng1.next()).toBe(rng2.next());
    }
  });

  it('produces different sequences from different seeds', () => {
    const rng1 = new Rng(1);
    const rng2 = new Rng(2);

    let identical = true;
    for (let i = 0; i < 20; i++) {
      if (rng1.next() !== rng2.next()) {
        identical = false;
        break;
      }
    }
    expect(identical).toBe(false);
  });

  it('produces values strictly within range [0, 1)', () => {
    const rng = new Rng(999);
    for (let i = 0; i < 1000; i++) {
      const val = rng.next();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('generates numbers within nextRange and nextInt bounds', () => {
    const rng = new Rng(555);
    for (let i = 0; i < 200; i++) {
      const f = rng.nextRange(10, 20);
      expect(f).toBeGreaterThanOrEqual(10);
      expect(f).toBeLessThan(20);

      const n = rng.nextInt(1, 6);
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(6);

      const s = rng.nextSigned();
      expect(s).toBeGreaterThanOrEqual(-1);
      expect(s).toBeLessThan(1);
    }
  });
});
