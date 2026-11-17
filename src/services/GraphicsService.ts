import type { EventBus } from '../core/EventBus';
import { clamp } from '../core/clamp';
import type { GameEvents } from '../data/GameEvents';
import { GRAPHICS_TIERS, type GraphicsTierConfig } from '../data/GraphicsTierConfig';

export type GraphicsTierId = 'low' | 'medium' | 'high';

export interface GraphicsServiceOptions {
  readonly bus?: EventBus<GameEvents>;
  readonly defaultTier?: GraphicsTierId;
  readonly initialScale?: number;
  /** Dev/test query string or search params */
  readonly searchParams?: URLSearchParams | string;
}

export class GraphicsService {
  private readonly bus?: EventBus<GameEvents>;
  private tierId: GraphicsTierId;
  private resolutionScale: number;

  constructor(options: GraphicsServiceOptions = {}) {
    this.bus = options.bus;

    // Default tier is 'medium'
    let initialTier: GraphicsTierId = options.defaultTier ?? 'medium';

    // In dev only, ?tier=low|medium|high overrides the default
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

      if (queryVal === 'low' || queryVal === 'medium' || queryVal === 'high') {
        initialTier = queryVal;
      }
    }

    this.tierId = initialTier;
    const rawScale = options.initialScale ?? 1.0;
    this.resolutionScale = clamp(rawScale, 0.6, 1.0);
  }

  public getTierId(): GraphicsTierId {
    return this.tierId;
  }

  public getTier(): GraphicsTierConfig {
    return GRAPHICS_TIERS[this.tierId];
  }

  public getResolutionScale(): number {
    return this.resolutionScale;
  }

  public setTier(tierId: GraphicsTierId): void {
    if (this.tierId === tierId) {
      return;
    }
    this.tierId = tierId;
    this.emitChange();
  }

  public setResolutionScale(scale: number): void {
    const clamped = clamp(scale, 0.6, 1.0);
    // Tolerate tiny floating point differences
    if (Math.abs(this.resolutionScale - clamped) < 1e-4) {
      return;
    }
    this.resolutionScale = clamped;
    this.emitChange();
  }

  public setGraphics(tierId: GraphicsTierId, scale: number): void {
    const clamped = clamp(scale, 0.6, 1.0);
    const tierChanged = this.tierId !== tierId;
    const scaleChanged = Math.abs(this.resolutionScale - clamped) >= 1e-4;

    if (!tierChanged && !scaleChanged) {
      return;
    }

    this.tierId = tierId;
    this.resolutionScale = clamped;
    this.emitChange();
  }

  private emitChange(): void {
    this.bus?.emit('graphics:changed', {
      tier: this.getTier(),
      resolutionScale: this.resolutionScale,
    });
  }
}
