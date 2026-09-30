import { createStyles } from 'antd-style';
import { type ReactNode, useState } from 'react';

import { useTouchGesture } from '@/shared/hooks/useTouchGesture';

import { groupMessageActions } from './messageActionGroups';
import { useMessageActionScope } from './MessageActionScope';
import { MessageActionSheet } from './MessageActionSheet';

const useStyles = createStyles(({ css }) => ({
  touchTarget: css`
    touch-action: pan-y pinch-zoom;
    [data-message-text] {
      user-select: none;
      -webkit-touch-callout: none;
    }
    a,
    button {
      -webkit-touch-callout: default;
    }
  `,
}));

export function MessageTouchActions({ children }: { children: ReactNode }) {
  const { styles } = useStyles();
  const scope = useMessageActionScope();
  const [open, setOpen] = useState(false);
  const available = scope.available(scope.messageTarget);
  const reply = available.find((action) => action.id === 'reply');
  const gesture = useTouchGesture({
    shouldStart: () => !scope.delivery,
    onLongPress: () => setOpen(true),
    onSwipeRight: () => {
      if (!reply) return false;
      scope.onAction(reply, scope.messageTarget);
      return true;
    },
  });

  if (!scope.isMobile) return <>{children}</>;

  return (
    <>
      <div
        className={styles.touchTarget}
        {...gesture}
        onContextMenu={(event) => {
          event.preventDefault();
          if (!scope.delivery) setOpen(true);
        }}
      >
        {children}
      </div>
      {open && (
        <MessageActionSheet
          open={open}
          onClose={() => setOpen(false)}
          author={scope.author}
          preview={scope.item.message.markdown}
          target={scope.messageTarget}
          groups={groupMessageActions(available)}
          onAction={scope.onAction}
        />
      )}
    </>
  );
}
