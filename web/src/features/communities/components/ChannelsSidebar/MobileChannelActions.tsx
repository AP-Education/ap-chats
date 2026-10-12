import { useTouchGesture } from '@ap-education/ui';
import { createStyles } from 'antd-style';
import { lazy, type PropsWithChildren, Suspense, useState } from 'react';

import type { Channel } from '../../channels/types';

const ChannelActionSheet = lazy(() =>
  import('./ChannelActionSheet').then(({ ChannelActionSheet }) => ({
    default: ChannelActionSheet,
  })),
);

const useStyles = createStyles(({ css }) => ({
  target: css`
    touch-action: pan-y;
    -webkit-touch-callout: none;
  `,
}));

interface MobileChannelActionsProps extends PropsWithChildren {
  channel: Channel;
  onSettings: () => void;
}

export function MobileChannelActions({ channel, onSettings, children }: MobileChannelActionsProps) {
  const { styles } = useStyles();
  const [sheetState, setSheetState] = useState<'idle' | 'open' | 'closed'>('idle');

  function show() {
    setSheetState('open');
  }

  const gesture = useTouchGesture({ onLongPress: show });

  return (
    <>
      <div
        className={styles.target}
        {...gesture}
        onContextMenu={(event) => {
          event.preventDefault();
          show();
        }}
        onKeyDown={(event) => {
          if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
            event.preventDefault();
            show();
          }
        }}
      >
        {children}
      </div>
      {sheetState !== 'idle' && (
        <Suspense fallback={null}>
          <ChannelActionSheet
            open={sheetState === 'open'}
            channel={channel}
            onClose={() => setSheetState('closed')}
            onSettings={onSettings}
          />
        </Suspense>
      )}
    </>
  );
}
