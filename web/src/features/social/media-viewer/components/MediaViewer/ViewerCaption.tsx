import { createStyles } from 'antd-style';

import { MessageMarkdown } from '@/features/social/mentions/components/MessageMarkdown/MessageMarkdown';
import type { MessageHistoryItem } from '@/features/social/messaging/types';

const useStyles = createStyles(({ token, css }) => ({
  // A long caption scrolls inside the bar rather than covering the photo.
  caption: css`
    flex: 0 1 720px;
    min-width: 0;
    max-width: 720px;
    max-height: min(30dvh, 168px);
    overflow-y: auto;
    padding-bottom: ${token.paddingXS}px;
    font-size: ${token.fontSize}px;
    line-height: 1.45;
    overflow-wrap: anywhere;
    overscroll-behavior: contain;

    p {
      margin: 0;
    }
    a {
      color: #8cc8ff;
    }
  `,
}));

interface ViewerCaptionProps {
  caption: string;
  /** The message it came in, for the people it mentions. */
  item: MessageHistoryItem;
  memberId: string | undefined;
}

export function ViewerCaption({ caption, item, memberId }: ViewerCaptionProps) {
  const { styles } = useStyles();

  return (
    <div className={styles.caption}>
      <MessageMarkdown
        markdown={caption}
        mentions={item.mentions}
        viewer={{
          memberId,
          mentioned: Boolean(item.mentionsMe),
          roleIds: item.rolesMentioningMe ?? [],
        }}
      />
    </div>
  );
}
