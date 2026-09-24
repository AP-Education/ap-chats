import { ConfigProvider, Grid, type ThemeConfig } from 'antd';
import ukUA from 'antd/locale/uk_UA';
import type { PropsWithChildren } from 'react';

function getTheme(isMobile: boolean): ThemeConfig {
  return {
    token: {
      colorPrimary: '#0c7d77',
      colorPrimaryBg: '#e6f4f3',
      colorPrimaryBgHover: '#d2ebe8',
      colorPrimaryBorder: '#9fcfc9',
      colorPrimaryBorderHover: '#7dbbb4',
      controlItemBgActive: '#e6f4f3',
      controlItemBgActiveHover: '#d2ebe8',
      colorText: '#1f2f2d',
      colorBorder: '#bcd5d2',
      borderRadius: 8,
      fontSize: 14,
      fontSizeHeading1: isMobile ? 28 : 38,
      fontFamily:
        'Ubuntu Sans, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial',
      padding: 16,
    },
    components: {
      Layout: {
        headerBg: '#fff',
        siderBg: '#fff',
        bodyBg: 'linear-gradient(135deg, #f3f9f8, #e7f2f1, #ddedec, #cee5e4)',
        headerHeight: isMobile ? 48 : 64,
      },
      Card: { borderRadiusLG: isMobile ? 8 : 12 },
      Menu: {
        iconSize: isMobile ? 18 : 20,
        activeBarBorderWidth: 0,
        itemHeight: isMobile ? 36 : 40,
        itemPaddingInline: isMobile ? 12 : 16,
      },
    },
  };
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const screens = Grid.useBreakpoint();
  return (
    <ConfigProvider theme={getTheme(!screens.md)} locale={ukUA}>
      {children}
    </ConfigProvider>
  );
}
