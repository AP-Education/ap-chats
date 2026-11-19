import { createStyles } from 'antd-style';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { useConversationScope } from '@/features/social/conversation-scope/store';
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

function describeTyping(labels: string[], t: TFunction<'messaging'>): string {
  if (labels.length === 1) return t(($) => $.typing.one, { name: labels[0] });
  if (labels.length === 2) return t(($) => $.typing.two, { first: labels[0], second: labels[1] });
  return t(($) => $.typing.many);
}

export function TypingIndicator() {
  const { styles } = useStyles();
  const { t } = useTranslation('messaging');
  const { workspaceId, channelId } = useConversationScope();
  const watchers = useTypingWatchers(workspaceId, channelId);
  const { byId, currentMember } = useWorkspaceMemberLabels(workspaceId);
  const typingMemberIds = watchers.filter((id) => id !== currentMember?.id);

  if (typingMemberIds.length === 0) return null;

  const labels = typingMemberIds.map(
    (memberId) => byId.get(memberId)?.label ?? t(($) => $.typing.someone),
  );

  return (
    <div className={styles.shell} role="status" aria-live="polite">
      <span className={styles.dots} aria-hidden="true">
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </span>
      {describeTyping(labels, t)}
    </div>
  );
}
