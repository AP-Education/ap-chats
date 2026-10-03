import { createStyles } from 'antd-style';

import { useConversationScope } from '@/features/social/conversation/store';
import { useWorkspaceMemberLabels } from '@/features/workspaces/hooks/useWorkspaceMemberLabels';

import { useTypingWatchers } from '../hooks/useTypingWatchers';

const useStyles = createStyles(({ token, css }) => ({
  shell: css`
    display: flex;
    align-items: center;
    gap: 7px;
    min-height: 20px;
    padding: 0 ${token.paddingLG}px;
    color: ${token.colorTextTertiary};
    font-size: 13px;

    @media (max-width: ${token.screenMD}px) {
      padding: 0 16px;
    }
  `,
  dots: css`
    display: inline-flex;
    align-items: center;
    gap: 3px;
  `,
  dot: css`
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: ${token.colorTextTertiary};
    animation: typing-dot-bounce 1.2s infinite ease-in-out;

    &:nth-of-type(2) {
      animation-delay: 0.15s;
    }

    &:nth-of-type(3) {
      animation-delay: 0.3s;
    }

    @keyframes typing-dot-bounce {
      0%,
      60%,
      100% {
        opacity: 0.35;
        transform: translateY(0);
      }

      30% {
        opacity: 1;
        transform: translateY(-2px);
      }
    }
  `,
}));

function describeTyping(labels: string[]): string {
  if (labels.length === 1) return `${labels[0]} пише`;
  if (labels.length === 2) return `${labels[0]} і ${labels[1]} пишуть`;
  return 'Кілька людей пишуть';
}

export function TypingIndicator() {
  const { styles } = useStyles();
  const { workspaceId, channelId } = useConversationScope();
  const typingMemberIds = useTypingWatchers(workspaceId, channelId);
  const { byId } = useWorkspaceMemberLabels(workspaceId);

  if (typingMemberIds.length === 0) return null;

  const labels = typingMemberIds.map((memberId) => byId.get(memberId)?.label ?? 'Хтось');

  return (
    <div className={styles.shell} role="status" aria-live="polite">
      <span className={styles.dots} aria-hidden="true">
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </span>
      {describeTyping(labels)}
    </div>
  );
}
