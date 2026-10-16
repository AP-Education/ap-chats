import { createStyles } from 'antd-style';
import type { ReactNode } from 'react';

import type { ViewerMedia } from '../../types';
import { ViewerCaption } from './ViewerCaption';

const useStyles = createStyles(({ token, css }) => ({
  bar: css`
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 10;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: ${token.paddingSM}px;
    padding: ${token.paddingXL}px ${token.paddingSM}px
      max(${token.paddingXS}px, env(safe-area-inset-bottom));
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));
    color: #fff;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;

    .pswp--ui-visible & {
      opacity: 1;
      pointer-events: auto;
    }
  `,
  tools: css`
    display: flex;
    flex-shrink: 0;
    gap: 2px;
    margin-left: auto;

    button {
      color: #fff;
    }
  `,
}));

interface ViewerBottomBarProps {
  media: ViewerMedia;
  memberId: string | undefined;
  /** The viewer's tools, on a phone, where the thumb reaches them. */
  tools: ReactNode;
}

/** The message's text under the media, centred on a wide screen, beside the tools on a phone. */
export function ViewerBottomBar({ media, memberId, tools }: ViewerBottomBarProps) {
  const { styles } = useStyles();
  if (!media.caption && !tools) return null;

  return (
    <footer className={styles.bar}>
      {media.caption && (
        <ViewerCaption
          key={media.item.id}
          caption={media.caption}
          item={media.item}
          memberId={memberId}
        />
      )}
      {tools && <div className={styles.tools}>{tools}</div>}
    </footer>
  );
}
