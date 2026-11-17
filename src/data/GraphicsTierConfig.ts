export type ShadowType = 'none' | 'pcf' | 'pcfSoft';

export interface GraphicsTierConfig {
  readonly id: 'low' | 'medium' | 'high';
  /** Maximum device pixel ratio cap (unitless scalar, e.g. 1.0, 1.5, 2.0). */
  readonly pixelRatioCap: number;
  /** High-level shadow identifier ('blob' | 'map' | 'softMap'). */
  readonly shadows: 'blob' | 'map' | 'softMap';
  /** Three.js shadow filtering technique ('none' | 'pcf' | 'pcfSoft'). */
  readonly shadowType: ShadowType;
  /** Directional shadow map resolution in texels (0 for blob shadows). */
  readonly shadowMapSize: number;
  /** Camera far clipping plane distance in meters. */
  readonly cameraFar: number;
  /** Linear fog start distance in meters. */
  readonly fogNear: number;
  /** Linear fog maximum distance in meters. */
  readonly fogFar: number;
  /** Draw distance in meters (matches cameraFar). */
  readonly drawDistance: number;
  /** Minimum allowed dynamic resolution scale factor (unitless fraction). */
  readonly resolutionScaleMin: number;
  /** Post-processing pass identifiers (data only in this task). */
  readonly postProcessing: readonly string[];
  /** Maximum background traffic cars. */
  readonly maxTraffic: number;
  /** Maximum number of AI racing opponents. */
  readonly maxOpponents: number;
  /** Particle emission scale factor (0 to 1). */
  readonly particleScale: number;
}

export const GRAPHICS_TIER_LOW: GraphicsTierConfig = {
  id: 'low',
  pixelRatioCap: 1,
  shadows: 'blob',
  shadowType: 'none',
  shadowMapSize: 0,
  cameraFar: 500,
  fogNear: 120,
  fogFar: 450,
  drawDistance: 500,
  resolutionScaleMin: 0.6,
  postProcessing: [],
  maxTraffic: 2,
  maxOpponents: 3,
  particleScale: 0.25,
};

export const GRAPHICS_TIER_MEDIUM: GraphicsTierConfig = {
  id: 'medium',
  pixelRatioCap: 1.5,
  shadows: 'map',
  shadowType: 'pcf',
  shadowMapSize: 1024,
  cameraFar: 900,
  fogNear: 200,
  fogFar: 800,
  drawDistance: 900,
  resolutionScaleMin: 0.6,
  postProcessing: ['bloom'],
  maxTraffic: 4,
  maxOpponents: 5,
  particleScale: 0.6,
};

export const GRAPHICS_TIER_HIGH: GraphicsTierConfig = {
  id: 'high',
  pixelRatioCap: 2,
  shadows: 'softMap',
  shadowType: 'pcfSoft',
  shadowMapSize: 2048,
  cameraFar: 1600,
  fogNear: 350,
  fogFar: 1500,
  drawDistance: 1600,
  resolutionScaleMin: 0.6,
  postProcessing: ['bloom', 'motionBlur', 'vignette'],
  maxTraffic: 6,
  maxOpponents: 5,
  particleScale: 1.0,
};

export const GRAPHICS_TIERS: Record<'low' | 'medium' | 'high', GraphicsTierConfig> = {
  low: GRAPHICS_TIER_LOW,
  medium: GRAPHICS_TIER_MEDIUM,
  high: GRAPHICS_TIER_HIGH,
};

/**
 * Calculates effective pixel ratio based on device pixel ratio, tier cap, and resolution scale.
 * Clamps to a sensible minimum (0.5) and a maximum (tierCap).
 */
export function getEffectivePixelRatio(
  devicePixelRatio: number,
  tierCap: number,
  resolutionScale: number,
): number {
  const safeDpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const safeCap = Number.isFinite(tierCap) && tierCap > 0 ? tierCap : 1;
  const safeScale = Number.isFinite(resolutionScale) ? resolutionScale : 1;

  const baseDpr = Math.min(safeDpr, safeCap);
  const effective = baseDpr * safeScale;

  return Math.max(0.5, Math.min(safeCap, effective));
}
