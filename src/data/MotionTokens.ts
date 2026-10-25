export interface MotionTokensConfig {
  readonly durFast: string;
  readonly durBase: string;
  readonly durSlow: string;
  readonly easeOut: string;
  readonly easeInOut: string;
}

export const MotionTokens: MotionTokensConfig = {
  durFast: '120ms',
  durBase: '200ms',
  durSlow: '320ms',
  easeOut: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;
