import { createStyles } from 'antd-style';

import { SWIPE_SETTLE_TRANSITION } from '@/shared/hooks/useTouchGesture';

const BACKDROP_TRANSITION = 'opacity 220ms ease-out';

export const useMobileNavSheetStyles = createStyles(({ token, css }) => ({
  backdrop: css`
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: #000;
    transition: ${BACKDROP_TRANSITION};
  `,
  panel: css`
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 1001;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: ${token.colorBgContainer};
    box-shadow: ${token.boxShadowSecondary};
    will-change: transform;
    transition: ${SWIPE_SETTLE_TRANSITION};
    touch-action: pan-y;
  `,
}));
