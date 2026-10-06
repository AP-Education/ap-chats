import { createStyles } from 'antd-style';

export const useChatsLayoutStyles = createStyles(({ token, css }) => ({
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
    padding-bottom: var(--shell-footer-space, 0px);
  `,
  channelSectionHidden: css`
    display: none;
  `,
}));
