import { createStyles } from 'antd-style';

// Single style source for MainLayout + MainSider (desktop sider and mobile
// drawer render the same nav/workspace content) — breakpoints come from antd's
// own screen tokens, not hardcoded px, so this stays in step with the rest of
// the design system.
export const useMainLayoutStyles = createStyles(({ token, css }) => ({
  layout: css`
    height: 100vh;
    overflow: hidden;
  `,
  mainArea: css`
    min-height: 0;
    overflow: hidden;
  `,
  content: css`
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    position: relative;
  `,
  header: css`
    padding: 0 24px;
    border-bottom: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgContainer};
    position: sticky;
    top: 0;
    z-index: 120;
    height: auto;
    min-height: 64px;
    line-height: normal;

    @media (max-width: ${token.screenLG - 1}px) {
      padding: 0 16px;
    }
  `,
  headerContent: css`
    padding: 8px 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  `,
  headerLeft: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  menuButton: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    padding: 0;
    font-size: 20px;
  `,
  brand: css`
    height: 48px;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
  `,
  brandText: css`
    color: ${token.colorText};
    font-weight: 600;
    font-size: 15px;
  `,
  brandMark: css`
    height: 46px;
    width: 46px;
    display: grid;
    place-items: center;
    border-radius: 8px;
    background: ${token.colorPrimary};
    color: #fff;
    font-size: 16px;
    font-weight: 700;
  `,
  sidebar: css`
    border-right: 1px solid ${token.colorBorderSecondary};
    position: relative;
    background: ${token.colorBgContainer};

    :global(.ant-layout-sider-trigger) {
      border-top: 1px solid ${token.colorBorder};
      border-right: 1px solid ${token.colorBorder};
    }
  `,
  sidebarStack: css`
    display: flex;
    flex-direction: column;
    height: 100%;
  `,
  sidebarMenu: css`
    background: ${token.colorBgContainer};
    border-inline-end: none !important;

    :global(.ant-menu-title-content a) {
      font-weight: 600 !important;
    }
  `,
  mobileDrawer: css`
    /* Mirrors .header's own padding (8px vertical from .headerContent, 16px
       horizontal on mobile) so the drawer reads as the same header, relocated. */
    :global(.ant-drawer-header) {
      padding: 8px 16px;
      background: ${token.colorBgContainer};
    }

    :global(.ant-drawer-close) {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      margin-inline-end: 0;
      border-radius: ${token.borderRadius}px;

      &:hover {
        background: ${token.colorFillTertiary};
      }
    }

    :global(.ant-drawer-body) {
      padding: 0 !important;
      background: ${token.colorBgLayout};
    }

    @media (max-width: ${token.screenXS}px) {
      :global(.ant-drawer-content-wrapper) {
        width: 88vw !important;
      }
    }
  `,
}));
