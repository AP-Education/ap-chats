import { useIsMobile } from '@ap-education/ui';

import type { MessageHistoryItem } from '@/features/social/messaging/types';

import { useReactionToggle } from '../../hooks/useReactionToggle';
import { ReactionGrid } from './ReactionGrid';
import { ReactionPickerPopover } from './ReactionPickerPopover';
import { ReactionPickerSheet } from './ReactionPickerSheet';

interface ReactionPickerProps {
  item: MessageHistoryItem;
  viewerMemberId: string | undefined;
  own: boolean;
  onClose: () => void;
}

/** Every emoji to react with: a popover by the message, or a sheet on a phone. */
export function ReactionPicker({ item, viewerMemberId, own, onClose }: ReactionPickerProps) {
  const isMobile = useIsMobile();
  const toggle = useReactionToggle(viewerMemberId);

  const grid = (
    <ReactionGrid
      onPick={(emoji) => {
        toggle(item, emoji);
        onClose();
      }}
    />
  );

  if (isMobile) return <ReactionPickerSheet onClose={onClose}>{grid}</ReactionPickerSheet>;
  return (
    <ReactionPickerPopover own={own} onClose={onClose}>
      {grid}
    </ReactionPickerPopover>
  );
}
