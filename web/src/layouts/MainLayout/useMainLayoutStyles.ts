import { createStyles } from 'antd-style';

export const useMainLayoutStyles = createStyles(({ token, css }) => ({
  layout: css`
    height: 100dvh;
    html[data-native-shell='true'] & {
      height: 100%;
    }
    overflow: hidden;
  `,
  mainArea: css`
    min-height: 0;
    overflow: hidden;

    @media (max-width: ${token.screenMD}px) {
      position: relative;
      isolation: isolate;
      --mobile-menu-progress: 0;

      &[data-menu-open='true'] {
        --mobile-menu-progress: 1;
      }

      &[data-menu-open='true'] > aside {
        visibility: visible;
        transition-delay: 0s;
      }

      &[data-menu-dragging='true'] > main,
      &[data-menu-dragging='true'] > aside {
        transition: none;
      }

      &[data-menu-dragging='true'] > aside {
        visibility: visible;
      }
    }
  `,
  content: css`
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    position: relative;

    @media (max-width: ${token.screenMD}px) {
      z-index: 1;
      flex: 0 0 100%;
      width: 100%;
      background: ${token.colorBgContainer};
      touch-action: pan-y pinch-zoom;
      transform: translate3d(calc(var(--mobile-menu-progress) * 100%), 0, 0);
      transition: transform 220ms cubic-bezier(0.22, 0.61, 0.36, 1);
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `,
  mobilePanel: css`
    position: absolute;
    inset: 0 auto 0 0;
    width: 100%;
    overflow: hidden;
    background: ${token.colorBgContainer};
    touch-action: pan-y pinch-zoom;
    transform: translate3d(calc((var(--mobile-menu-progress) - 1) * 32px), 0, 0);
    visibility: hidden;
    transition:
      transform 220ms cubic-bezier(0.22, 0.61, 0.36, 1),
      visibility 0s 220ms;

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
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
    position: relative;
    display: flex;
    align-items: center;
    height: 60px;
    flex-shrink: 0;

    @media (max-width: ${token.screenMD}px) {
      height: 56px;
    }
  `,
  sidebarProfile: css`
    padding: 8px 12px;
    border-top: 1px solid ${token.colorBorderSecondary};
    flex-shrink: 0;

    @media (max-width: ${token.screenMD}px) {
      padding-bottom: calc(8px + env(safe-area-inset-bottom));
    }
  `,
  nav: css`
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 12px;
    flex-shrink: 0;

    @media (max-width: ${token.screenMD}px) {
      padding: 8px 12px;
    }
  `,
  navItem: css`
    display: flex;
    align-items: center;
    gap: 10px;
    height: 38px;
    padding: 0 10px;
    width: 100%;
    border: 0;
    border-radius: ${token.borderRadius}px;
    background: transparent;
    color: ${token.colorTextSecondary};
    font: inherit;
    font-weight: 500;
    text-align: left;
    cursor: pointer;
    text-decoration: none;
    transition:
      background 0.15s ease,
      color 0.15s ease;

    @media (max-width: ${token.screenMD}px) {
      height: 44px;
      gap: 12px;
      padding-inline: 12px;
      font-size: 16px;
    }

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
  navLabel: css`
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  navBadge: css`
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 9px;
    background: ${token.colorError};
    color: ${token.colorWhite};
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
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
  channelSectionHidden: css`
    display: none;
  `,
}));
