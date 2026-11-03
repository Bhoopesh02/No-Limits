export const LOADING_TIPS: readonly string[] = [
  'Drift through corners to charge your nitro boost meter.',
  'Draft closely behind opponents to gain slipstream speed.',
  'Smooth steering maintains higher exit speeds through bends.',
  'Hit nitro on straightaways to maximize top acceleration.',
  'Soft barrier collisions slow you down but will never wreck your car.',
] as const;

export function getRandomLoadingTip(seed?: number): string {
  if (typeof seed === 'number') {
    const idx = Math.abs(seed) % LOADING_TIPS.length;
    return LOADING_TIPS[idx];
  }
  return LOADING_TIPS[0];
}
