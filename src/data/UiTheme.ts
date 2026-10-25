export interface UiThemeColors {
  readonly bgBase: string;
  readonly surface1: string;
  readonly surface2: string;
  readonly surface3: string;
  readonly border: string;
  readonly textPrimary: string;
  readonly textSecondary: string;
  readonly textDisabled: string;
  readonly accent: string;
  readonly success: string;
  readonly warning: string;
  readonly danger: string;
  readonly gems: string;
}

export interface UiThemeFonts {
  readonly fontDisplay: string;
  readonly fontBody: string;
}

export interface UiThemeSpacing {
  readonly space1: string;
  readonly space2: string;
  readonly space3: string;
  readonly space4: string;
  readonly space5: string;
  readonly space6: string;
  readonly space7: string;
}

export interface UiThemeRadius {
  readonly radiusS: string;
  readonly radiusM: string;
  readonly radiusL: string;
}

export interface UiThemeElevation {
  readonly elev1: string;
  readonly elev2: string;
}

export interface UiThemeTypeScale {
  readonly fs12: string;
  readonly fs14: string;
  readonly fs16: string;
  readonly fs20: string;
  readonly fs24: string;
  readonly fs32: string;
  readonly fs48: string;
}

export interface UiThemeAccents {
  readonly day: string;
  readonly dusk: string;
  readonly night: string;
}

export interface UiThemeConfig {
  readonly colors: UiThemeColors;
  readonly fonts: UiThemeFonts;
  readonly spacing: UiThemeSpacing;
  readonly radius: UiThemeRadius;
  readonly elevation: UiThemeElevation;
  readonly typeScale: UiThemeTypeScale;
  readonly accents: UiThemeAccents;
}

export const UiTheme: UiThemeConfig = {
  colors: {
    bgBase: '#0b0e14',
    surface1: '#121722',
    surface2: '#1a2130',
    surface3: '#232c3f',
    border: '#2e394f',
    textPrimary: '#f2f5fa',
    textSecondary: '#a8b3c7',
    textDisabled: '#5c677d',
    accent: '#3da5ff',
    success: '#3ddc84',
    warning: '#ffc933',
    danger: '#ff4d5e',
    gems: '#c084ff',
  },
  fonts: {
    fontDisplay: "'Chakra Petch', system-ui, sans-serif",
    fontBody: "'Barlow', system-ui, sans-serif",
  },
  spacing: {
    space1: '4px',
    space2: '8px',
    space3: '12px',
    space4: '16px',
    space5: '24px',
    space6: '32px',
    space7: '48px',
  },
  radius: {
    radiusS: '6px',
    radiusM: '12px',
    radiusL: '20px',
  },
  elevation: {
    elev1: '0 2px 6px rgba(0, 0, 0, 0.35)',
    elev2: '0 8px 24px rgba(0, 0, 0, 0.45)',
  },
  typeScale: {
    fs12: '12px',
    fs14: '14px',
    fs16: '16px',
    fs20: '20px',
    fs24: '24px',
    fs32: '32px',
    fs48: '48px',
  },
  accents: {
    day: '#3da5ff',
    dusk: '#ff8a3d',
    night: '#00e5ff',
  },
} as const;
