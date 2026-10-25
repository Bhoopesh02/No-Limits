export type UpdateCallback = (fixedDt: number) => void;
export type RenderCallback = (alpha: number) => void;
export type TimeSource = () => number;

export interface FrameScheduler {
  request(callback: (timestampMs: number) => void): number;
  cancel(handle: number): void;
}

export interface GameLoopOptions {
  readonly update: UpdateCallback;
  readonly render: RenderCallback;
  /** Fixed timestep in seconds. Default is 1 / 60 (60 Hz). */
  readonly fixedDt?: number;
  /** Maximum allowed delta per frame in seconds before clamping. Default is 0.25 (250 ms). */
  readonly maxFrameDelta?: number;
  /** Maximum simulation steps allowed per rendered frame to prevent spiral of death. Default is 5. */
  readonly maxStepsPerFrame?: number;
  /** Custom time source (e.g. for testing). Default is performance.now(). */
  readonly timeSource?: TimeSource;
  /** Custom frame scheduler (e.g. for testing). Default is requestAnimationFrame. */
  readonly scheduler?: FrameScheduler;
}

const DEFAULT_FIXED_DT = 1 / 60;
const DEFAULT_MAX_FRAME_DELTA = 0.25;
const DEFAULT_MAX_STEPS_PER_FRAME = 5;

const defaultTimeSource: TimeSource = (): number => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
};

const defaultScheduler: FrameScheduler = {
  request(callback: (timestampMs: number) => void): number {
    if (typeof requestAnimationFrame !== 'undefined') {
      return requestAnimationFrame(callback);
    }
    const timer = setTimeout(() => {
      callback(defaultTimeSource());
    }, 16);
    return timer as unknown as number;
  },
  cancel(handle: number): void {
    if (typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(handle);
    } else {
      clearTimeout(handle);
    }
  },
};

/**
 * Fixed-timestep 60 Hz GameLoop with accumulator and render interpolation alpha.
 *
 * Performance notes:
 * - Zero allocations per frame in `tick` / `onFrame`.
 * - Pre-bound `onFrame` handler to eliminate per-frame closure allocations.
 * - Caps simulation steps to avoid spiral of death on low-end hardware.
 * - Pure and testable in Node without a browser DOM.
 */
export class GameLoop {
  private readonly updateCallback: UpdateCallback;
  private readonly renderCallback: RenderCallback;
  public readonly fixedDt: number;
  public readonly maxFrameDelta: number;
  public readonly maxStepsPerFrame: number;
  private readonly timeSource: TimeSource;
  private readonly scheduler: FrameScheduler;

  private running = false;
  private frameHandle: number | null = null;
  private lastTimeMs = 0;
  private accumulator = 0;

  constructor(options: GameLoopOptions) {
    this.updateCallback = options.update;
    this.renderCallback = options.render;
    this.fixedDt = options.fixedDt ?? DEFAULT_FIXED_DT;
    this.maxFrameDelta = options.maxFrameDelta ?? DEFAULT_MAX_FRAME_DELTA;
    this.maxStepsPerFrame = options.maxStepsPerFrame ?? DEFAULT_MAX_STEPS_PER_FRAME;
    this.timeSource = options.timeSource ?? defaultTimeSource;
    this.scheduler = options.scheduler ?? defaultScheduler;
  }

  public isRunning(): boolean {
    return this.running;
  }

  public getAccumulator(): number {
    return this.accumulator;
  }

  public start(): void {
    if (this.running) return;

    this.running = true;
    this.accumulator = 0;
    this.lastTimeMs = this.timeSource();
    this.frameHandle = this.scheduler.request(this.onFrame);
  }

  public stop(): void {
    if (!this.running) return;

    this.running = false;
    if (this.frameHandle !== null) {
      this.scheduler.cancel(this.frameHandle);
      this.frameHandle = null;
    }
  }

  /**
   * Advances the simulation by a given timestamp.
   * Public for deterministic testing without depending on timers.
   */
  public tick(currentTimeMs: number): void {
    let deltaSec = (currentTimeMs - this.lastTimeMs) * 0.001;
    this.lastTimeMs = currentTimeMs;

    if (deltaSec < 0) {
      deltaSec = 0;
    }

    if (deltaSec > this.maxFrameDelta) {
      deltaSec = this.maxFrameDelta;
    }

    this.accumulator += deltaSec;

    let steps = 0;
    while (this.accumulator >= this.fixedDt && steps < this.maxStepsPerFrame) {
      this.updateCallback(this.fixedDt);
      this.accumulator -= this.fixedDt;
      steps++;
    }

    // Protection against spiral of death: drop debt if max steps reached
    if (steps >= this.maxStepsPerFrame && this.accumulator >= this.fixedDt) {
      this.accumulator = 0;
    }

    const alpha = this.accumulator / this.fixedDt;
    this.renderCallback(alpha);
  }

  private readonly onFrame = (currentTimeMs: number): void => {
    if (!this.running) return;

    this.tick(currentTimeMs);

    if (this.running) {
      this.frameHandle = this.scheduler.request(this.onFrame);
    }
  };
}
