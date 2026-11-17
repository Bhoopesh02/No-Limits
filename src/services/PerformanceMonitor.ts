import { clamp } from '../core/clamp';
import {
  AUTO_DOWNGRADE_TIME_S,
  AUTO_UPGRADE_TIME_S,
  FPS_THRESHOLDS,
  RESOLUTION_SCALE_CEILING,
  RESOLUTION_SCALE_FLOOR,
  RESOLUTION_SCALE_STEP,
  type GraphicsTierId,
} from '../data/GraphicsTierConfig';

export interface PerformanceMonitorOptions {
  readonly initialTier?: GraphicsTierId;
  readonly initialScale?: number;
  readonly enabled?: boolean;
  readonly onDowngradeScale?: (newScale: number) => void;
  readonly onDowngradeTier?: (newTier: GraphicsTierId, newScale: number) => void;
  readonly onUpgradeScale?: (newScale: number) => void;
  readonly onUpgradeTier?: (newTier: GraphicsTierId, newScale: number) => void;
}

/**
 * Tracks frame-timing performance during active gameplay, adjusts dynamic resolution scaling,
 * and automatically demotes/promotes graphics tiers when running in Auto mode.
 *
 * Guarantees zero heap allocation per recorded frame to preserve hot-path performance.
 */
export class PerformanceMonitor {
  private currentTier: GraphicsTierId;
  private currentScale: number;
  private enabled: boolean;

  private rollingAvgDt: number;
  private rollingFps: number;
  private underTargetDuration = 0;
  private overTargetDuration = 0;

  private readonly onDowngradeScale?: (newScale: number) => void;
  private readonly onDowngradeTier?: (newTier: GraphicsTierId, newScale: number) => void;
  private readonly onUpgradeScale?: (newScale: number) => void;
  private readonly onUpgradeTier?: (newTier: GraphicsTierId, newScale: number) => void;

  constructor(options: PerformanceMonitorOptions = {}) {
    this.currentTier = options.initialTier ?? 'medium';
    this.currentScale = clamp(
      options.initialScale ?? 1.0,
      RESOLUTION_SCALE_FLOOR,
      RESOLUTION_SCALE_CEILING,
    );
    this.enabled = options.enabled ?? false;

    // Seed rolling average near 60 FPS (16.6 ms)
    this.rollingAvgDt = 0.016667;
    this.rollingFps = 60;

    this.onDowngradeScale = options.onDowngradeScale;
    this.onDowngradeTier = options.onDowngradeTier;
    this.onUpgradeScale = options.onUpgradeScale;
    this.onUpgradeTier = options.onUpgradeTier;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean): void {
    if (this.enabled !== enabled) {
      this.enabled = enabled;
      this.underTargetDuration = 0;
      this.overTargetDuration = 0;
    }
  }

  public reset(tier: GraphicsTierId, scale: number): void {
    this.currentTier = tier;
    this.currentScale = clamp(scale, RESOLUTION_SCALE_FLOOR, RESOLUTION_SCALE_CEILING);
    this.underTargetDuration = 0;
    this.overTargetDuration = 0;
  }

  public syncCurrentState(tier: GraphicsTierId, scale: number): void {
    this.currentTier = tier;
    this.currentScale = clamp(scale, RESOLUTION_SCALE_FLOOR, RESOLUTION_SCALE_CEILING);
  }

  public getRollingFps(): number {
    return this.rollingFps;
  }

  public getRollingAvgDt(): number {
    return this.rollingAvgDt;
  }

  public getUnderTargetDuration(): number {
    return this.underTargetDuration;
  }

  public getOverTargetDuration(): number {
    return this.overTargetDuration;
  }

  /**
   * Evaluates an initial benchmark / probe to pick the best tier before race start.
   */
  public probeInitialTier(samples?: readonly number[]): GraphicsTierId {
    let avgDt = 0.016667;

    if (samples && samples.length > 0) {
      let sum = 0;
      for (let i = 0; i < samples.length; i++) {
        sum += samples[i];
      }
      avgDt = sum / samples.length;
    }

    if (avgDt <= 0.0175) {
      // >= ~57 FPS
      return 'high';
    }
    if (avgDt <= 0.024) {
      // >= ~42 FPS
      return 'medium';
    }
    return 'low';
  }

  /**
   * Called every rendered frame.
   * Hot path: no heap allocations (no objects, closures, or arrays).
   */
  public recordFrame(frameDt: number, isEligibleForAuto: boolean): void {
    // Sanitize frame delta: clamp between 1 ms and 100 ms to avoid pause spikes
    if (!Number.isFinite(frameDt) || frameDt <= 0) {
      return;
    }
    const safeDt = frameDt > 0.1 ? 0.1 : frameDt < 0.001 ? 0.001 : frameDt;

    // Exponential moving average: alpha = 0.05
    this.rollingAvgDt = this.rollingAvgDt * 0.95 + safeDt * 0.05;
    this.rollingFps = 1.0 / this.rollingAvgDt;

    if (!this.enabled || !isEligibleForAuto) {
      this.underTargetDuration = 0;
      this.overTargetDuration = 0;
      return;
    }

    const tierInfo = FPS_THRESHOLDS[this.currentTier];

    // Check downgrade condition
    if (this.rollingFps < tierInfo.downgrade) {
      this.underTargetDuration += safeDt;
      this.overTargetDuration = 0;

      if (this.underTargetDuration >= AUTO_DOWNGRADE_TIME_S) {
        this.underTargetDuration = 0;

        // Try reducing resolution scale first
        if (this.currentScale > RESOLUTION_SCALE_FLOOR + 0.05) {
          const nextScale = Math.max(
            RESOLUTION_SCALE_FLOOR,
            Math.round((this.currentScale - RESOLUTION_SCALE_STEP) * 100) / 100,
          );
          this.currentScale = nextScale;
          this.onDowngradeScale?.(nextScale);
        } else {
          // Resolution scale is already at floor (0.6) -> Demote tier
          if (this.currentTier === 'high') {
            this.currentTier = 'medium';
            this.currentScale = RESOLUTION_SCALE_CEILING;
            this.onDowngradeTier?.('medium', this.currentScale);
          } else if (this.currentTier === 'medium') {
            this.currentTier = 'low';
            this.currentScale = RESOLUTION_SCALE_CEILING;
            this.onDowngradeTier?.('low', this.currentScale);
          }
          // If already low at 0.6 scale, cannot demote further
        }
      }
      return;
    }

    // Check upgrade condition
    const hasUpgrade = 'upgrade' in tierInfo;
    const upgradeThreshold = hasUpgrade ? (tierInfo as { upgrade: number }).upgrade : Infinity;

    if (this.rollingFps >= upgradeThreshold) {
      this.overTargetDuration += safeDt;
      this.underTargetDuration = 0;

      if (this.overTargetDuration >= AUTO_UPGRADE_TIME_S) {
        this.overTargetDuration = 0;

        // Upgrade resolution scale first if not at ceiling
        if (this.currentScale < RESOLUTION_SCALE_CEILING - 0.05) {
          const nextScale = Math.min(
            RESOLUTION_SCALE_CEILING,
            Math.round((this.currentScale + RESOLUTION_SCALE_STEP) * 100) / 100,
          );
          this.currentScale = nextScale;
          this.onUpgradeScale?.(nextScale);
        } else {
          // Scale is already at 1.0 -> Promote tier
          if (this.currentTier === 'low') {
            this.currentTier = 'medium';
            this.currentScale = RESOLUTION_SCALE_CEILING;
            this.onUpgradeTier?.('medium', this.currentScale);
          } else if (this.currentTier === 'medium') {
            this.currentTier = 'high';
            this.currentScale = RESOLUTION_SCALE_CEILING;
            this.onUpgradeTier?.('high', this.currentScale);
          }
          // High tier is top
        }
      }
      return;
    }

    // Operating within the stable envelope
    this.underTargetDuration = 0;
    this.overTargetDuration = 0;
  }
}
