import { ConfigProvider, type ThemeConfig } from 'antd';
import ukUA from 'antd/locale/uk_UA';
import type { PropsWithChildren } from 'react';

import { useIsMobile } from '../../shared/hooks/useIsMobile';

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
      fontSize: 16,
      fontSizeHeading1: isMobile ? 28 : 38,
      fontFamily:
        'Ubuntu Sans, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial',
      padding: 16,
      paddingContentHorizontalLG: isMobile ? 16 : 24,
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

export function ThemeProvider({ children }: PropsWithChildren) {
  const isMobile = useIsMobile();
  return (
    <ConfigProvider theme={getTheme(isMobile)} locale={ukUA}>
      {children}
    </ConfigProvider>
  );
}
