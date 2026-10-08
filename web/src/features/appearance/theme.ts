import { theme, type ThemeConfig } from 'antd';

import type { AccentColors, Appearance } from './types';

// Neutral surfaces per appearance; the accent preset supplies every primary shade.
const palettes = {
  light: {
    token: {
      colorText: '#1f2f2d',
      colorBgLayout: '#f3f9f8',
      colorBorder: '#bcd5d2',
    },
    surface: '#fff',
    page: 'linear-gradient(135deg, #f3f9f8, #e7f2f1, #ddedec, #cee5e4)',
  },
  dark: {
    token: {
      colorText: '#e3ecea',
      colorBgLayout: '#0c1113',
      colorBgContainer: '#131a1c',
      colorBgElevated: '#1a2224',
      colorBorder: '#2b3638',
      colorBorderSecondary: '#20292b',
      // The dark algorithm keeps shadows white, which glows around popovers and menus.
      boxShadow:
        '0 6px 16px 0 rgba(0, 0, 0, 0.36), 0 3px 6px -4px rgba(0, 0, 0, 0.5), 0 9px 28px 8px rgba(0, 0, 0, 0.24)',
      boxShadowSecondary:
        '0 6px 16px 0 rgba(0, 0, 0, 0.36), 0 3px 6px -4px rgba(0, 0, 0, 0.5), 0 9px 28px 8px rgba(0, 0, 0, 0.24)',
      boxShadowTertiary:
        '0 1px 2px 0 rgba(0, 0, 0, 0.3), 0 1px 6px -1px rgba(0, 0, 0, 0.22), 0 2px 4px 0 rgba(0, 0, 0, 0.22)',
    },
    surface: '#131a1c',
    page: '#0c1113',
  },
};

function accentTokens(accent: AccentColors) {
  return {
    colorPrimary: accent.primary,
    colorPrimaryBg: accent.primaryBg,
    colorPrimaryBgHover: accent.primaryBgHover,
    colorPrimaryBorder: accent.primaryBorder,
    colorPrimaryBorderHover: accent.primaryBorderHover,
    colorPrimaryText: accent.primaryText,
    colorPrimaryTextActive: accent.primaryTextActive,
    controlItemBgActive: accent.primaryBg,
    controlItemBgActiveHover: accent.primaryBgHover,
  };
}

export function appearanceTheme(
  appearance: Appearance,
  accent: AccentColors,
  isMobile: boolean,
): ThemeConfig {
  const palette = palettes[appearance];

  return {
    algorithm: appearance === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      ...palette.token,
      ...accentTokens(accent),
      borderRadius: 8,
      fontSize: 16,
      fontSizeHeading1: isMobile ? 28 : 38,
      fontFamily:
        'Ubuntu Sans, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial',
      padding: 16,
      paddingContentHorizontalLG: isMobile ? 16 : 24,
    },
    components: {
      Layout: {
        headerBg: palette.surface,
        siderBg: palette.surface,
        bodyBg: palette.page,
        headerHeight: isMobile ? 48 : 64,
      },
      Card: { borderRadiusLG: isMobile ? 8 : 12 },
      Menu: {
        iconSize: 20,
        activeBarBorderWidth: 0,
        itemHeight: 46,
        itemPaddingInline: isMobile ? 12 : 16,
      },
      // The component token, not a CSS override: Drawer injects its own
      // `.ant-drawer-body { padding: paddingLG }` rule lazily (on first open),
      // which can land in the stylesheet after ours and win the tie — setting
      // the token itself sidesteps that race entirely.
      Drawer: {
        padding: 0,
        paddingLG: 0,
      },
    },
  };
}
