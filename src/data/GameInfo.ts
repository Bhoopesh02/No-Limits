export interface GameInfoConfig {
  readonly displayName: string;
  readonly shortName: string;
  readonly version: string;
  readonly appId: string;
}

export const GameInfo: GameInfoConfig = {
  displayName: 'No Limits',
  shortName: 'NoLimits',
  version: '0.1.0',
  appId: 'com.nolimits.racing',
} as const;
