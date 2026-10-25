export interface GraphicsTierConfig {
  id: 'low' | 'medium' | 'high';
  pixelRatioCap: number;
  shadows: 'blob' | 'map' | 'softMap';
  postProcessing: readonly string[];
  drawDistance: number;
  maxTraffic: number;
  maxOpponents: number;
  particleScale: number; // 0 to 1
}

export const GRAPHICS_TIER_LOW: GraphicsTierConfig = {
  id: 'low',
  pixelRatioCap: 1,
  shadows: 'blob',
  postProcessing: [],
  drawDistance: 500,
  maxTraffic: 2,
  maxOpponents: 3,
  particleScale: 0.25,
};

export const GRAPHICS_TIER_MEDIUM: GraphicsTierConfig = {
  id: 'medium',
  pixelRatioCap: 1.5,
  shadows: 'map',
  postProcessing: ['bloom'],
  drawDistance: 1000,
  maxTraffic: 4,
  maxOpponents: 5,
  particleScale: 0.6,
};

export const GRAPHICS_TIER_HIGH: GraphicsTierConfig = {
  id: 'high',
  pixelRatioCap: 2,
  shadows: 'softMap',
  postProcessing: ['bloom', 'motionBlur', 'vignette'],
  drawDistance: 2000,
  maxTraffic: 6,
  maxOpponents: 5,
  particleScale: 1.0,
};

export const GRAPHICS_TIERS: Record<'low' | 'medium' | 'high', GraphicsTierConfig> = {
  low: GRAPHICS_TIER_LOW,
  medium: GRAPHICS_TIER_MEDIUM,
  high: GRAPHICS_TIER_HIGH,
};
