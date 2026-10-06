import { createStyles } from 'antd-style';

export const useShellLayoutStyles = createStyles(({ token, css }) => ({
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
  contentHost: css`
    height: 100%;
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
  siderBody: css`
    /* Room panels and the rail keep free at the bottom so the floating footer never hides content. */
    --shell-footer-space: calc(88px + env(safe-area-inset-bottom, 0px));

    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  `,
  siderMain: css`
    display: flex;
    flex: 1;
    min-height: 0;
  `,
  panelHost: css`
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
  `,
  footer: css`
    position: absolute;
    right: 8px;
    bottom: calc(8px + env(safe-area-inset-bottom, 0px));
    left: 8px;
    z-index: 2;
    overflow: hidden;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadiusLG}px;
    background: ${token.colorBgContainer};
  `,
}));
