/**
 * Standings and race position tracker for all competing cars.
 *
 * Rules:
 * - Cars that have finished are ranked strictly by finish order (finish step).
 * - Running cars are ranked by total race progress in meters.
 * - Progress uses an unwrapped accumulator from distance deltas so crossing the start/finish line never causes a drop or jump.
 * - Insertion sort over pre-allocated Int32Arrays (zero allocations per simulation step).
 * - Deterministic tie-breaking by car index.
 */
export class Standings {
  public readonly totalCars: number;
  public readonly trackLength: number;
  private readonly halfTrackLength: number;

  private readonly finished: boolean[];
  private readonly finishStep: Float64Array;
  private readonly totalProgress: Float64Array;
  private readonly lastDistance: Float64Array;

  // order[rank] = carIndex (order[0] is 1st place, order[1] is 2nd place, etc.)
  private readonly order: Int32Array;
  // positions[carIndex] = 1-based rank (1 to totalCars)
  private readonly positions: Int32Array;

  constructor(trackLength: number, totalCars = 6) {
    this.trackLength = Math.max(1, trackLength);
    this.halfTrackLength = this.trackLength * 0.5;
    this.totalCars = totalCars;

    this.finished = new Array(totalCars).fill(false);
    this.finishStep = new Float64Array(totalCars).fill(Infinity);
    this.totalProgress = new Float64Array(totalCars);
    this.lastDistance = new Float64Array(totalCars);

    this.order = new Int32Array(totalCars);
    this.positions = new Int32Array(totalCars);

    for (let i = 0; i < totalCars; i++) {
      this.order[i] = i;
      this.positions[i] = i + 1;
    }
  }

  public reset(initialDistances?: readonly number[]): void {
    for (let i = 0; i < this.totalCars; i++) {
      const initDist = initialDistances && i < initialDistances.length ? initialDistances[i] : 0;
      this.finished[i] = false;
      this.finishStep[i] = Infinity;
      this.totalProgress[i] = initDist;
      this.lastDistance[i] = initDist;
      this.order[i] = i;
      this.positions[i] = i + 1;
    }
    this.sort();
  }

  /**
   * Updates distance along track for a specific car and accumulates unwrapped progress.
   */
  public updateProgress(carIndex: number, distanceAlongTrack: number): void {
    if (carIndex < 0 || carIndex >= this.totalCars) return;

    let delta = distanceAlongTrack - this.lastDistance[carIndex];
    if (delta < -this.halfTrackLength) {
      delta += this.trackLength;
    } else if (delta > this.halfTrackLength) {
      delta -= this.trackLength;
    }

    this.totalProgress[carIndex] += delta;
    this.lastDistance[carIndex] = distanceAlongTrack;
  }

  /**
   * Records that a car completed all required race laps at the given simulation step.
   */
  public recordFinish(carIndex: number, currentStep: number): void {
    if (carIndex < 0 || carIndex >= this.totalCars) return;
    if (this.finished[carIndex]) return;

    this.finished[carIndex] = true;
    this.finishStep[carIndex] = currentStep;
  }

  /**
   * Sorts the standings in-place using preallocated buffers and insertion sort (zero allocation).
   */
  public sort(): void {
    const n = this.totalCars;
    for (let i = 1; i < n; i++) {
      const currentCar = this.order[i];
      let j = i - 1;
      while (j >= 0 && this.isBetter(currentCar, this.order[j])) {
        this.order[j + 1] = this.order[j];
        j--;
      }
      this.order[j + 1] = currentCar;
    }

    for (let rank = 0; rank < n; rank++) {
      this.positions[this.order[rank]] = rank + 1;
    }
  }

  /**
   * Returns true if carA should be ranked ahead of carB.
   */
  private isBetter(carA: number, carB: number): boolean {
    const finA = this.finished[carA];
    const finB = this.finished[carB];

    // 1. Finish status takes precedence
    if (finA && !finB) return true;
    if (!finA && finB) return false;

    // 2. Both finished: compare finishStep
    if (finA && finB) {
      const stepA = this.finishStep[carA];
      const stepB = this.finishStep[carB];
      if (stepA !== stepB) {
        return stepA < stepB;
      }
    }

    // 3. Neither finished (or finished at identical step): compare total unwrapped progress
    const progA = this.totalProgress[carA];
    const progB = this.totalProgress[carB];
    if (Math.abs(progA - progB) > 1e-4) {
      return progA > progB;
    }

    // 4. Deterministic tie-breaker by car index
    return carA < carB;
  }

  /**
   * Returns the 1-based standing position of a car (1 for 1st, 2 for 2nd, etc.).
   */
  public positionOf(carIndex: number): number {
    if (carIndex < 0 || carIndex >= this.totalCars) return this.totalCars;
    return this.positions[carIndex];
  }

  /**
   * Returns the car index at the specified 0-based rank (0 for 1st place, 1 for 2nd place, etc.).
   */
  public getCarAtRank(rank: number): number {
    if (rank < 0 || rank >= this.totalCars) return 0;
    return this.order[rank];
  }

  public getOrderedCarIndices(): readonly number[] {
    return Array.from(this.order);
  }

  public getProgress(carIndex: number): number {
    if (carIndex < 0 || carIndex >= this.totalCars) return 0;
    return this.totalProgress[carIndex];
  }

  public hasFinished(carIndex: number): boolean {
    if (carIndex < 0 || carIndex >= this.totalCars) return false;
    return this.finished[carIndex];
  }

  public getFinishStep(carIndex: number): number {
    if (carIndex < 0 || carIndex >= this.totalCars) return Infinity;
    return this.finishStep[carIndex];
  }
}
