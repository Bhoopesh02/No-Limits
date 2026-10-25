import { describe, expect, it } from 'vitest';
import { MotionTokens } from '../../data/MotionTokens';
import { UiTheme } from '../../data/UiTheme';
import tokensCss from './tokens.css?raw';

function parseCssVariables(cssContent: string): Map<string, string> {
  const vars = new Map<string, string>();
  const rootMatch = cssContent.match(/:root\s*\{([^}]+)\}/);
  if (!rootMatch) {
    throw new Error('Could not find :root block in tokens.css');
  }

  const declRegex = /--([a-z0-9-]+)\s*:\s*([^;]+);/g;
  let match: RegExpExecArray | null;
  while ((match = declRegex.exec(rootMatch[1])) !== null) {
    vars.set(`--${match[1]}`, match[2].trim());
  }

  return vars;
}

function parseThemeAccents(cssContent: string): { day: string; dusk: string; night: string } {
  const getAccent = (theme: string): string => {
    const regex = new RegExp(
      `:root\\[data-time=['"]${theme}['"]\\]\\s*\\{[^}]*--accent:\\s*([^;]+);`,
    );
    const match = cssContent.match(regex);
    if (!match) {
      throw new Error(`Could not find data-time='${theme}' accent in tokens.css`);
    }
    return match[1].trim();
  };

  return {
    day: getAccent('day'),
    dusk: getAccent('dusk'),
    night: getAccent('night'),
  };
}

describe('tokens.css synchronization with UiTheme and MotionTokens', () => {
  const cssVars = parseCssVariables(tokensCss);

  it('matches all color tokens with UiTheme', () => {
    expect(UiTheme.colors.bgBase).toBe(cssVars.get('--bg-base'));
    expect(UiTheme.colors.surface1).toBe(cssVars.get('--surface-1'));
    expect(UiTheme.colors.surface2).toBe(cssVars.get('--surface-2'));
    expect(UiTheme.colors.surface3).toBe(cssVars.get('--surface-3'));
    expect(UiTheme.colors.border).toBe(cssVars.get('--border'));
    expect(UiTheme.colors.textPrimary).toBe(cssVars.get('--text-primary'));
    expect(UiTheme.colors.textSecondary).toBe(cssVars.get('--text-secondary'));
    expect(UiTheme.colors.textDisabled).toBe(cssVars.get('--text-disabled'));
    expect(UiTheme.colors.accent).toBe(cssVars.get('--accent'));
    expect(UiTheme.colors.success).toBe(cssVars.get('--success'));
    expect(UiTheme.colors.warning).toBe(cssVars.get('--warning'));
    expect(UiTheme.colors.danger).toBe(cssVars.get('--danger'));
    expect(UiTheme.colors.gems).toBe(cssVars.get('--gems'));
  });

  it('matches font tokens with UiTheme', () => {
    const normalizeFont = (val?: string): string => (val ?? '').replace(/["']/g, "'");
    expect(normalizeFont(UiTheme.fonts.fontDisplay)).toBe(
      normalizeFont(cssVars.get('--font-display')),
    );
    expect(normalizeFont(UiTheme.fonts.fontBody)).toBe(normalizeFont(cssVars.get('--font-body')));
  });

  it('matches spacing tokens with UiTheme', () => {
    expect(UiTheme.spacing.space1).toBe(cssVars.get('--space-1'));
    expect(UiTheme.spacing.space2).toBe(cssVars.get('--space-2'));
    expect(UiTheme.spacing.space3).toBe(cssVars.get('--space-3'));
    expect(UiTheme.spacing.space4).toBe(cssVars.get('--space-4'));
    expect(UiTheme.spacing.space5).toBe(cssVars.get('--space-5'));
    expect(UiTheme.spacing.space6).toBe(cssVars.get('--space-6'));
    expect(UiTheme.spacing.space7).toBe(cssVars.get('--space-7'));
  });

  it('matches radius and elevation tokens with UiTheme', () => {
    expect(UiTheme.radius.radiusS).toBe(cssVars.get('--radius-s'));
    expect(UiTheme.radius.radiusM).toBe(cssVars.get('--radius-m'));
    expect(UiTheme.radius.radiusL).toBe(cssVars.get('--radius-l'));
    expect(UiTheme.elevation.elev1).toBe(cssVars.get('--elev-1'));
    expect(UiTheme.elevation.elev2).toBe(cssVars.get('--elev-2'));
  });

  it('matches type scale tokens with UiTheme', () => {
    expect(UiTheme.typeScale.fs12).toBe(cssVars.get('--fs-12'));
    expect(UiTheme.typeScale.fs14).toBe(cssVars.get('--fs-14'));
    expect(UiTheme.typeScale.fs16).toBe(cssVars.get('--fs-16'));
    expect(UiTheme.typeScale.fs20).toBe(cssVars.get('--fs-20'));
    expect(UiTheme.typeScale.fs24).toBe(cssVars.get('--fs-24'));
    expect(UiTheme.typeScale.fs32).toBe(cssVars.get('--fs-32'));
    expect(UiTheme.typeScale.fs48).toBe(cssVars.get('--fs-48'));
  });

  it('matches accents with data-time selectors in tokens.css', () => {
    const accents = parseThemeAccents(tokensCss);
    expect(UiTheme.accents.day).toBe(accents.day);
    expect(UiTheme.accents.dusk).toBe(accents.dusk);
    expect(UiTheme.accents.night).toBe(accents.night);
  });

  it('matches motion tokens with MotionTokens', () => {
    expect(MotionTokens.durFast).toBe(cssVars.get('--dur-fast'));
    expect(MotionTokens.durBase).toBe(cssVars.get('--dur-base'));
    expect(MotionTokens.durSlow).toBe(cssVars.get('--dur-slow'));
    expect(MotionTokens.easeOut).toBe(cssVars.get('--ease-out'));
    expect(MotionTokens.easeInOut).toBe(cssVars.get('--ease-in-out'));
  });
});
