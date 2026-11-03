import type { CarData } from '../data/CarData';
import { DEFAULT_CAR_KAZE } from '../data/CarData';
import type { TrackControlPoint, TrackData } from '../data/TrackData';
import { parseTrackData } from '../data/TrackData';
import type { TrackSpline } from '../data/TrackSpline';
import { TrackView } from './TrackView';

export interface LoadedRaceAssets {
  readonly trackData: TrackData;
  readonly carData: CarData;
  readonly spline: TrackSpline;
  readonly trackView: TrackView;
}

export interface AssetLoaderOptions {
  readonly onProgress?: (ratio: number) => void;
  readonly trackUrl?: string;
  readonly carUrl?: string;
  readonly createSpline?: (points: readonly TrackControlPoint[], stepSize?: number) => TrackSpline;
}

/**
 * Weighted asynchronous asset loader.
 *
 * Rules:
 * - Runs tasks with weights (track JSON, car JSON, procedural track build).
 * - Reports progress from 0.0 to 1.0.
 * - Yields control between tasks to never block the main thread.
 * - Clear error reporting for failed tasks.
 * - Uses import.meta.env.BASE_URL for public paths.
 */
export class AssetLoader {
  private readonly onProgress?: (ratio: number) => void;
  private readonly trackUrl: string;
  private readonly carUrl: string;
  private readonly createSpline?: (
    points: readonly TrackControlPoint[],
    stepSize?: number,
  ) => TrackSpline;

  constructor(options: AssetLoaderOptions = {}) {
    this.onProgress = options.onProgress;
    this.createSpline = options.createSpline;
    const base = import.meta.env.BASE_URL ?? '/';
    this.trackUrl =
      options.trackUrl ?? `${base}assets/tracks/coastal-highway/data/track-coastal-highway.json`;
    this.carUrl = options.carUrl ?? `${base}assets/cars/kaze/data/car-kaze.json`;
  }

  public async load(): Promise<LoadedRaceAssets> {
    this.onProgress?.(0.05);
    await this.yieldControl();

    // 1. Fetch Track JSON (Weight: ~30%)
    let trackData: TrackData;
    try {
      const res = await fetch(this.trackUrl);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const json: unknown = await res.json();
      trackData = parseTrackData(json);
    } catch (err) {
      throw new Error(`Track load failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    this.onProgress?.(0.35);
    await this.yieldControl();

    // 2. Fetch Car JSON (Weight: ~25%)
    let carData: CarData = { ...DEFAULT_CAR_KAZE };
    try {
      const res = await fetch(this.carUrl);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const json: unknown = await res.json();
      carData = { ...DEFAULT_CAR_KAZE, ...(json as Partial<CarData>) };
    } catch {
      // Fallback to default car parameters if car json fails to load
      carData = { ...DEFAULT_CAR_KAZE };
    }
    this.onProgress?.(0.6);
    await this.yieldControl();

    // 3. Construct Spline and TrackView (Weight: ~40%)
    if (!this.createSpline) {
      throw new Error('AssetLoader requires createSpline factory option to construct TrackView');
    }

    let spline: TrackSpline;
    let trackView: TrackView;
    try {
      spline = this.createSpline(trackData.controlPoints, 1.0);
      this.onProgress?.(0.8);
      await this.yieldControl();

      trackView = new TrackView(spline, trackData);
    } catch (err) {
      throw new Error(
        `Track generation failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    this.onProgress?.(1.0);
    await this.yieldControl();

    return {
      trackData,
      carData,
      spline,
      trackView,
    };
  }

  private yieldControl(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }
}
