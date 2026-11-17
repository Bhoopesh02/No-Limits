import type { EventBus } from '../core/EventBus';
import { clamp } from '../core/clamp';
import type { GameEvents } from '../data/GameEvents';
import {
  GRAPHICS_TIERS,
  type GraphicsTierConfig,
  type GraphicsTierId,
  type GraphicsTierOption,
} from '../data/GraphicsTierConfig';
import { PerformanceMonitor } from './PerformanceMonitor';

export type { GraphicsTierId, GraphicsTierOption };

export interface GraphicsServiceOptions {
  readonly bus?: EventBus<GameEvents>;
  readonly defaultTier?: GraphicsTierOption;
  readonly initialScale?: number;
  /** Dev/test query string or search params */
  readonly searchParams?: URLSearchParams | string;
}

export class GraphicsService {
  private readonly bus?: EventBus<GameEvents>;
  private selectedOption: GraphicsTierOption;
  private activeTierId: GraphicsTierId;
  private resolutionScale: number;
  private readonly performanceMonitor: PerformanceMonitor;

  constructor(options: GraphicsServiceOptions = {}) {
    this.bus = options.bus;

    // Default tier option
    let initialOption: GraphicsTierOption = options.defaultTier ?? 'medium';

    // In dev only, ?tier=auto|low|medium|high overrides the default
    if (import.meta.env.DEV) {
      let queryVal: string | null = null;
      if (options.searchParams !== undefined) {
        const params =
          typeof options.searchParams === 'string'
            ? new URLSearchParams(options.searchParams)
            : options.searchParams;
        queryVal = params.get('tier');
      } else if (typeof window !== 'undefined' && window.location?.search) {
        const params = new URLSearchParams(window.location.search);
        queryVal = params.get('tier');
      }

      if (
        queryVal === 'auto' ||
        queryVal === 'low' ||
        queryVal === 'medium' ||
        queryVal === 'high'
      ) {
        initialOption = queryVal;
      }
    }

    this.selectedOption = initialOption;
    this.activeTierId = initialOption === 'auto' ? 'medium' : initialOption;

    const rawScale = options.initialScale ?? 1.0;
    this.resolutionScale = clamp(rawScale, 0.6, 1.0);

    this.performanceMonitor = new PerformanceMonitor({
      initialTier: this.activeTierId,
      initialScale: this.resolutionScale,
      enabled: this.selectedOption === 'auto',
      onDowngradeScale: (newScale) => {
        this.resolutionScale = newScale;
        this.emitChange();
      },
      onDowngradeTier: (newTier, newScale) => {
        this.activeTierId = newTier;
        this.resolutionScale = newScale;
        this.emitChange();
      },
      onUpgradeScale: (newScale) => {
        this.resolutionScale = newScale;
        this.emitChange();
      },
      onUpgradeTier: (newTier, newScale) => {
        this.activeTierId = newTier;
        this.resolutionScale = newScale;
        this.emitChange();
      },
    });
  }

  public getSelectedOption(): GraphicsTierOption {
    return this.selectedOption;
  }

  public getActiveTierId(): GraphicsTierId {
    return this.activeTierId;
  }

  public getTierId(): GraphicsTierId {
    return this.activeTierId;
  }

  public getTier(): GraphicsTierConfig {
    return GRAPHICS_TIERS[this.activeTierId];
  }

  public getResolutionScale(): number {
    return this.resolutionScale;
  }

  public isAuto(): boolean {
    return this.selectedOption === 'auto';
  }

  public getPerformanceMonitor(): PerformanceMonitor {
    return this.performanceMonitor;
  }

  public probeAndApplyInitialTier(samples?: readonly number[]): GraphicsTierId {
    const probed = this.performanceMonitor.probeInitialTier(samples);
    if (this.selectedOption === 'auto') {
      const changed = this.activeTierId !== probed;
      this.activeTierId = probed;
      this.performanceMonitor.syncCurrentState(probed, this.resolutionScale);
      if (changed) {
        this.emitChange();
      }
    }
    return probed;
  }

  public setTier(option: GraphicsTierOption): void {
    if (option === 'auto') {
      const wasAuto = this.selectedOption === 'auto';
      this.selectedOption = 'auto';
      this.performanceMonitor.setEnabled(true);
      this.performanceMonitor.syncCurrentState(this.activeTierId, this.resolutionScale);
      if (!wasAuto) {
        this.emitChange();
      }
      return;
    }

    const optionChanged = this.selectedOption !== option;
    const tierChanged = this.activeTierId !== option;

    this.selectedOption = option;
    this.activeTierId = option;
    this.performanceMonitor.setEnabled(false);
    this.performanceMonitor.syncCurrentState(option, this.resolutionScale);

    if (optionChanged || tierChanged) {
      this.emitChange();
    }
  }

  public setResolutionScale(scale: number): void {
    const clamped = clamp(scale, 0.6, 1.0);
    if (Math.abs(this.resolutionScale - clamped) < 1e-4) {
      return;
    }
    this.resolutionScale = clamped;
    this.performanceMonitor.syncCurrentState(this.activeTierId, this.resolutionScale);
    this.emitChange();
  }

  public setGraphics(option: GraphicsTierOption, scale: number): void {
    const clamped = clamp(scale, 0.6, 1.0);
    const optionChanged = this.selectedOption !== option;
    const scaleChanged = Math.abs(this.resolutionScale - clamped) >= 1e-4;

    if (!optionChanged && !scaleChanged) {
      return;
    }

    this.selectedOption = option;
    if (option === 'auto') {
      this.performanceMonitor.setEnabled(true);
    } else {
      this.activeTierId = option;
      this.performanceMonitor.setEnabled(false);
    }

    this.resolutionScale = clamped;
    this.performanceMonitor.syncCurrentState(this.activeTierId, this.resolutionScale);
    this.emitChange();
  }

  /**
   * Called during render to feed real frame delta time to the auto performance monitor.
   * Hot path: no heap allocations.
   */
  public recordFrame(frameDt: number, isEligibleForAuto: boolean): void {
    this.performanceMonitor.recordFrame(frameDt, isEligibleForAuto);
  }

  private emitChange(): void {
    this.bus?.emit('graphics:changed', {
      tier: this.getTier(),
      resolutionScale: this.resolutionScale,
      isAuto: this.isAuto(),
      selectedOption: this.selectedOption,
    });
  }
}
