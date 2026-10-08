import { createStyles } from 'antd-style';

import { useIsMobile } from '@/shared/hooks/useIsMobile';

import { LeaveCallControl } from './controls/LeaveCallControl';
import {
  CameraControl,
  FlipCameraControl,
  MicrophoneControl,
  ScreenShareControl,
} from './controls/MediaControls';

const useStyles = createStyles(({ token, css }) => ({
  bar: css`
    position: relative;
    display: flex;
    justify-content: center;
    flex-shrink: 0;
    padding: 16px 16px calc(24px + env(safe-area-inset-bottom, 0px));
  `,
  dock: css`
    display: flex;
    align-items: center;
    gap: ${token.paddingSM}px;
    padding: 10px;
    border-radius: 999px;
    background: color-mix(in srgb, ${token.colorBgLayout} 46%, transparent);
    backdrop-filter: blur(24px) saturate(1.4);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.32);

    @media (max-width: ${token.screenSM}px) {
      gap: ${token.paddingXS}px;
      padding: ${token.paddingXS}px;
    }
  `,
}));

// Touch targets grow on phones; the icons keep the call-button size from the icon guidelines.
const CONTROL_SIZE = { desktop: { size: 48, iconSize: 24 }, mobile: { size: 52, iconSize: 24 } };

/** The full screen's floating dock: every control owns its own track or room state. */
export function CallControls() {
  const { styles } = useStyles();
  const isMobile = useIsMobile();
  const control = CONTROL_SIZE[isMobile ? 'mobile' : 'desktop'];

  return (
    <div className={styles.bar}>
      <div className={styles.dock}>
        <MicrophoneControl {...control} />
        <CameraControl {...control} />
        <FlipCameraControl {...control} />
        <ScreenShareControl {...control} />
        <LeaveCallControl {...control} />
      </div>
    </div>
  );
}
