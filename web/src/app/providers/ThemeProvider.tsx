import { ConfigProvider, Grid, type ThemeConfig } from 'antd';
import ukUA from 'antd/locale/uk_UA';
import type { PropsWithChildren } from 'react';

function getTheme(isMobile: boolean): ThemeConfig {
  return {
    token: {
      colorPrimary: '#0c7d77',
      colorPrimaryBg: '#e6f4f3',
      colorPrimaryBorder: '#9fcfc9',
      colorText: '#203333',
      colorBorder: '#b4c9c6',
      borderRadius: 8,
      fontSize: 14,
      fontSizeHeading1: isMobile ? 28 : 38,
      fontFamily: "'Ubuntu Sans', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    components: {
      Layout: {
        headerBg: '#fff',
        siderBg: '#fff',
        bodyBg: '#f4f8f7',
        headerHeight: isMobile ? 56 : 64,
      },
      Card: { borderRadiusLG: isMobile ? 8 : 12 },
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
