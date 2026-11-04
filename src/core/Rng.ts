/**
 * Seeded 32-bit pseudo-random number generator (Mulberry32).
 * Deterministic and allocation-free for simulation and AI systems.
 */
export class Rng {
  private state: number;

  constructor(seed = 123456789) {
    this.state = seed >>> 0;
  }

  /**
   * Resets the internal state with a new seed.
   */
  public seed(seed: number): void {
    this.state = seed >>> 0;
  }

  /**
   * Returns a pseudo-random floating point number in [0, 1).
   */
  public next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a pseudo-random integer in [min, max] inclusive.
   */
  public nextInt(min: number, max: number): number {
    const lo = Math.ceil(min);
    const hi = Math.floor(max);
    return Math.floor(this.next() * (hi - lo + 1)) + lo;
  }

  /**
   * Returns a pseudo-random float in [min, max).
   */
  public nextRange(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Returns a pseudo-random float in [-1, 1).
   */
  public nextSigned(): number {
    return this.next() * 2 - 1;
  }
}
