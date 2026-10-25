import { describe, expect, it } from 'vitest';
import { MotionTokens } from './MotionTokens';
import { UiTheme } from './UiTheme';

describe('UiTheme data structure and tokens', () => {
  it('defines all required colors with valid hex formats', () => {
    const hexRegex = /^#([0-9a-fA-F]{6})$/;
    expect(UiTheme.colors.bgBase).toMatch(hexRegex);
    expect(UiTheme.colors.surface1).toMatch(hexRegex);
    expect(UiTheme.colors.surface2).toMatch(hexRegex);
    expect(UiTheme.colors.surface3).toMatch(hexRegex);
    expect(UiTheme.colors.border).toMatch(hexRegex);
    expect(UiTheme.colors.textPrimary).toMatch(hexRegex);
    expect(UiTheme.colors.textSecondary).toMatch(hexRegex);
    expect(UiTheme.colors.textDisabled).toMatch(hexRegex);
    expect(UiTheme.colors.accent).toMatch(hexRegex);
    expect(UiTheme.colors.success).toMatch(hexRegex);
    expect(UiTheme.colors.warning).toMatch(hexRegex);
    expect(UiTheme.colors.danger).toMatch(hexRegex);
    expect(UiTheme.colors.gems).toMatch(hexRegex);
  });

  it('defines fonts with Chakra Petch and Barlow', () => {
    expect(UiTheme.fonts.fontDisplay).toContain('Chakra Petch');
    expect(UiTheme.fonts.fontBody).toContain('Barlow');
  });

  it('defines the 8-point base spacing scale', () => {
    expect(UiTheme.spacing.space1).toBe('4px');
    expect(UiTheme.spacing.space2).toBe('8px');
    expect(UiTheme.spacing.space3).toBe('12px');
    expect(UiTheme.spacing.space4).toBe('16px');
    expect(UiTheme.spacing.space5).toBe('24px');
    expect(UiTheme.spacing.space6).toBe('32px');
    expect(UiTheme.spacing.space7).toBe('48px');
  });

  it('defines radii and elevation tokens', () => {
    expect(UiTheme.radius.radiusS).toBe('6px');
    expect(UiTheme.radius.radiusM).toBe('12px');
    expect(UiTheme.radius.radiusL).toBe('20px');
    expect(UiTheme.elevation.elev1).toBe('0 2px 6px rgba(0, 0, 0, 0.35)');
    expect(UiTheme.elevation.elev2).toBe('0 8px 24px rgba(0, 0, 0, 0.45)');
  });

  it('defines typography scale tokens', () => {
    expect(UiTheme.typeScale.fs12).toBe('12px');
    expect(UiTheme.typeScale.fs14).toBe('14px');
    expect(UiTheme.typeScale.fs16).toBe('16px');
    expect(UiTheme.typeScale.fs20).toBe('20px');
    expect(UiTheme.typeScale.fs24).toBe('24px');
    expect(UiTheme.typeScale.fs32).toBe('32px');
    expect(UiTheme.typeScale.fs48).toBe('48px');
  });

  it('defines time-of-day accents', () => {
    expect(UiTheme.accents.day).toBe('#3da5ff');
    expect(UiTheme.accents.dusk).toBe('#ff8a3d');
    expect(UiTheme.accents.night).toBe('#00e5ff');
  });

  it('defines motion tokens conforming to specs', () => {
    expect(MotionTokens.durFast).toBe('120ms');
    expect(MotionTokens.durBase).toBe('200ms');
    expect(MotionTokens.durSlow).toBe('320ms');
    expect(MotionTokens.easeOut).toBe('cubic-bezier(0.2, 0.8, 0.2, 1)');
    expect(MotionTokens.easeInOut).toBe('cubic-bezier(0.4, 0, 0.2, 1)');
  });
});
