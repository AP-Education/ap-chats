import { Popover } from 'antd';
import { createStyles } from 'antd-style';
import { lazy, Suspense } from 'react';

import { EmojiTabSkeleton } from '@/features/social/messaging/components/MessageComposer/picker/EmojiTabSkeleton';
import type { MessageHistoryItem } from '@/features/social/messaging/types';
import { BottomSheet } from '@/shared/ui/BottomSheet';

import { useReactionToggle } from '../../hooks/useReactionToggle';

// The composer's emoji grid, loaded on first use like there: the data set stays out of the chat bundle.
const EmojiTab = lazy(() =>
  import('@/features/social/messaging/components/MessageComposer/picker/EmojiTab').then(
    (module) => ({ default: module.EmojiTab }),
  ),
);

const useStyles = createStyles(({ css }) => ({
  // A point at the top corner of the row on the author's side, for the popover to open from.
  anchor: css`
    position: absolute;
    top: 0;
    left: 0;
    width: 0;
    height: 0;

    &[data-own] {
      right: 0;
      left: auto;
    }
  `,
  popover: css`
    display: flex;
    flex-direction: column;
    width: 352px;
    height: 400px;
  `,
  sheet: css`
    display: flex;
    flex-direction: column;
    height: min(60dvh, 480px);
  `,
}));

interface ReactionPickerProps {
  item: MessageHistoryItem;
  viewerMemberId: string | undefined;
  open: boolean;
  onClose: () => void;
}

function ReactionGrid({ item, viewerMemberId, onClose }: Omit<ReactionPickerProps, 'open'>) {
  const toggle = useReactionToggle(viewerMemberId);

  return (
    <Suspense fallback={<EmojiTabSkeleton />}>
      <EmojiTab
        onPick={(emoji) => {
          toggle(item, emoji);
          onClose();
        }}
      />
    </Suspense>
  );
}

/** Every emoji, beside the message on a pointer device; placed inside the message row. */
export function ReactionPickerPopover({
  item,
  viewerMemberId,
  open,
  onClose,
  own,
}: ReactionPickerProps & { own: boolean }) {
  const { styles } = useStyles();

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      trigger="click"
      placement={own ? 'topRight' : 'topLeft'}
      arrow={false}
      destroyOnHidden
      content={
        <div className={styles.popover}>
          <ReactionGrid item={item} viewerMemberId={viewerMemberId} onClose={onClose} />
        </div>
      }
    >
      <span className={styles.anchor} data-own={own || undefined} aria-hidden="true" />
    </Popover>
  );
}

/** Every emoji, in a sheet from the bottom of a phone screen. */
export function ReactionPickerSheet({ item, viewerMemberId, open, onClose }: ReactionPickerProps) {
  const { styles } = useStyles();

  return (
    <BottomSheet open={open} onClose={onClose} aria-label="Вибір реакції">
      <div className={styles.sheet}>
        <ReactionGrid item={item} viewerMemberId={viewerMemberId} onClose={onClose} />
      </div>
    </BottomSheet>
  );
}
