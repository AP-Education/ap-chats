import { createStyles } from 'antd-style';
import { type ReactNode, useRef } from 'react';

import { FrameAspectProvider, useAspectRatio, useLayoutOffset } from '../hooks/useFrameGeometry';

const useStyles = createStyles(({ css }) => ({
  host: css`
    position: absolute;
    inset: 0;
    z-index: -1;
    overflow: hidden;
    pointer-events: none;
  `,
  // Large viewport height: an on-screen keyboard clips the wallpaper instead of
  // rescaling it under the messages.
  frame: css`
    position: absolute;
    width: 100vw;
    height: 100lvh;
  `,
}));

interface ViewportFrameProps {
  children: ReactNode;
}

// Lays its layers out across the whole screen and shows only the part behind its own
// container, so wallpaper drawn in separate containers lines up into one picture.
// The container needs `isolation: isolate` to keep the frame behind its content.
export function ViewportFrame({ children }: ViewportFrameProps) {
  const { styles } = useStyles();
  const hostRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const offset = useLayoutOffset(hostRef);
  const aspectRatio = useAspectRatio(frameRef);

  return (
    <div ref={hostRef} className={styles.host} aria-hidden>
      <div ref={frameRef} className={styles.frame} style={{ left: -offset.left, top: -offset.top }}>
        <FrameAspectProvider value={aspectRatio}>{children}</FrameAspectProvider>
      </div>
    </div>
  );
}
