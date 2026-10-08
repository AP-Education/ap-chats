import type { Icon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';

import type { IncomingCallActionPresentation } from '../../hooks/useIncomingCallPresentation';
import { CallActionButton, type CallActionTone } from '../CallActionButton/CallActionButton';

const useStyles = createStyles(({ token, css }) => ({
  action: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  `,
  label: css`
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSizeSM}px;
  `,
}));

interface IncomingCallActionProps {
  action: IncomingCallActionPresentation;
  tone: Extract<CallActionTone, 'danger' | 'accept'>;
  icon: Icon;
  disabled: boolean;
}

/** One answer to a ring, captioned the way the system call sheet labels its buttons. */
export function IncomingCallAction({
  action,
  tone,
  icon: ActionIcon,
  disabled,
}: IncomingCallActionProps) {
  const { styles } = useStyles();

  return (
    <span className={styles.action}>
      <CallActionButton
        size={64}
        tone={tone}
        loading={action.pending}
        disabled={disabled}
        aria-label={action.ariaLabel}
        onClick={action.onClick}
      >
        <ActionIcon size={24} weight="fill" />
      </CallActionButton>
      <span className={styles.label}>{action.actionLabel}</span>
    </span>
  );
}
