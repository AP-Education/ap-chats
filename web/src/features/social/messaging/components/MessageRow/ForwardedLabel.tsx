import { createStyles } from 'antd-style';

import { ForwardIcon } from '@/features/social/conversation/actionIcons';

import { ForwardedAuthorName } from './ForwardedAuthorName';
import { useMessageActionScope } from './MessageActionScope';

const useStyles = createStyles(({ token, css }) => ({
  forwarded: css`
    display: flex;
    align-items: center;
    gap: ${token.paddingXXS}px;
    min-width: 0;
    color: var(--bubble-accent);
    font-size: ${token.fontSizeSM}px;
    line-height: 1.3;
  `,
}));

export function ForwardedLabel() {
  const { styles } = useStyles();
  const { item } = useMessageActionScope();

  if (!item.message.isForwarded) return null;

  return (
    <div className={styles.forwarded}>
      <ForwardIcon size={14} aria-hidden />
      <span>
        Переслано від <ForwardedAuthorName member={item.forwardedFrom} />
      </span>
    </div>
  );
}
