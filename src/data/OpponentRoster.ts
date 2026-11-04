import { CarData, DEFAULT_CAR_KAZE } from './CarData';

export interface OpponentDriver {
  readonly id: string;
  readonly displayName: string;
  readonly paintColor: string;
  readonly skill: number; // 0.90 to 1.00
  readonly lineBias: number; // meters lateral preference (-0.4 to +0.4)
  readonly seedOffset: number;
  readonly carData: CarData;
}

/**
 * 5 fictional opponent drivers with distinct styles, skills, and colors.
 * All cars use valid CarData variants within CarLimits envelopes.
 */
export const OPPONENT_ROSTER: readonly OpponentDriver[] = [
  {
    id: 'apex',
    displayName: 'Apex Hunter',
    paintColor: '#FF4D5E', // Red
    skill: 0.98,
    lineBias: -0.25,
    seedOffset: 101,
    carData: {
      ...DEFAULT_CAR_KAZE,
      id: 'kaze_apex',
      displayName: 'Apex Kaze',
      topSpeed: 64.0, // 230 km/h
      grip: 8.7,
    },
  },
  {
    id: 'phantom',
    displayName: 'Phantom Ray',
    paintColor: '#00E5FF', // Electric Cyan
    skill: 0.95,
    lineBias: 0.2,
    seedOffset: 202,
    carData: {
      ...DEFAULT_CAR_KAZE,
      id: 'kaze_phantom',
      displayName: 'Phantom Kaze',
      topSpeed: 63.0,
      grip: 8.6,
    },
  },
  {
    id: 'viper',
    displayName: 'Silver Viper',
    paintColor: '#F2F5FA', // Silver
    skill: 0.93,
    lineBias: -0.15,
    seedOffset: 303,
    carData: {
      ...DEFAULT_CAR_KAZE,
      id: 'kaze_viper',
      displayName: 'Viper Kaze',
      topSpeed: 62.0,
      grip: 8.5,
    },
  },
  {
    id: 'blaze',
    displayName: 'Blaze Comet',
    paintColor: '#FF8A3D', // Orange
    skill: 0.91,
    lineBias: 0.3,
    seedOffset: 404,
    carData: {
      ...DEFAULT_CAR_KAZE,
      id: 'kaze_blaze',
      displayName: 'Blaze Kaze',
      topSpeed: 61.5,
      grip: 8.4,
    },
  },
  {
    id: 'shadow',
    displayName: 'Shadow Pulse',
    paintColor: '#C084FF', // Neon Purple
    skill: 0.9,
    lineBias: 0.0,
    seedOffset: 505,
    carData: {
      ...DEFAULT_CAR_KAZE,
      id: 'kaze_shadow',
      displayName: 'Shadow Kaze',
      topSpeed: 61.0,
      grip: 8.3,
    },
  },
];
