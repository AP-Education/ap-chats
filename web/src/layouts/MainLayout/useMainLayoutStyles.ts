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
  mobileBar: css`
    display: flex;
    align-items: center;
    height: 52px;
    padding: 0 8px;
    border-bottom: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgContainer};
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
  sidebar: css`
    border-right: 1px solid ${token.colorBorderSecondary};
    position: relative;
    background: ${token.colorBgContainer};
  `,
  sidebarStack: css`
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  `,
  sidebarWorkspace: css`
    display: flex;
    align-items: center;
    height: 60px;
    flex-shrink: 0;
  `,
  sidebarProfile: css`
    padding: 8px 12px;
    border-top: 1px solid ${token.colorBorderSecondary};
    flex-shrink: 0;
  `,
  nav: css`
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 12px;
    flex-shrink: 0;
  `,
  navItem: css`
    display: flex;
    align-items: center;
    gap: 10px;
    height: 38px;
    padding: 0 10px;
    border-radius: ${token.borderRadius}px;
    color: ${token.colorTextSecondary};
    font-weight: 500;
    text-decoration: none;
    transition:
      background 0.15s ease,
      color 0.15s ease;

    &:hover {
      background: ${token.colorFillTertiary};
      color: ${token.colorText};
    }
  `,
  navItemActive: css`
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimaryTextActive};

    &:hover {
      background: ${token.colorPrimaryBgHover};
      color: ${token.colorPrimaryTextActive};
    }
  `,
  navDivider: css`
    height: 1px;
    margin: 4px 16px 8px;
    background: ${token.colorBorderSecondary};
    flex-shrink: 0;
  `,
  channelSection: css`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  `,
  mobileDrawer: css`
    :global(.ant-drawer-header) {
      padding: 8px 12px;
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
      background: ${token.colorBgContainer};
    }

    @media (max-width: ${token.screenXS}px) {
      :global(.ant-drawer-content-wrapper) {
        width: 88vw !important;
      }
    }
  `,
}));
