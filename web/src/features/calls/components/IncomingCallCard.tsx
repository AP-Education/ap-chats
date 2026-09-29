import { LoadingOutlined } from '@ant-design/icons';
import { PhoneIcon, PhoneXIcon } from '@phosphor-icons/react';
import { message as toast } from 'antd';
import { createStyles, keyframes } from 'antd-style';

import { Avatar } from '@/shared/ui/Avatar/Avatar';

import { useDeclineIncomingCall } from '../hooks/useDeclineIncomingCall';
import { useJoinCall } from '../hooks/useJoinCall';
import type { CallSignal } from '../schemas';

const riseIn = keyframes`
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

const useStyles = createStyles(({ token, css }) => ({
  card: css`
    position: fixed;
    right: 20px;
    bottom: 20px;
    z-index: 1200;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    border-radius: 16px;
    background: ${token.colorBgElevated};
    box-shadow: ${token.boxShadowSecondary};
    animation: ${riseIn} ${token.motionDurationMid} ${token.motionEaseOut};

    @media (max-width: ${token.screenSM}px) {
      left: 12px;
      right: 12px;
      bottom: 12px;
    }
  `,
  info: css`
    display: flex;
    flex-direction: column;
    min-width: 0;
  `,
  name: css`
    font-weight: 650;
    color: ${token.colorText};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  status: css`
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextSecondary};
  `,
  actions: css`
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  `,
  circleButton: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    transition: background ${token.motionDurationFast} ease;

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `,
  decline: css`
    background: ${token.colorErrorBg};
    color: ${token.colorError};

    &:hover:not(:disabled) {
      background: ${token.colorErrorBgHover};
    }
  `,
  accept: css`
    background: ${token.colorPrimary};
    color: #fff;

    &:hover:not(:disabled) {
      background: ${token.colorPrimaryHover};
    }
  `,
}));

interface IncomingCallCardProps {
  signal: CallSignal;
}

export function IncomingCallCard({ signal }: IncomingCallCardProps) {
  const { styles, cx } = useStyles();
  const decline = useDeclineIncomingCall();
  const name = signal.startedByDisplayName ?? 'Колега';
  const join = useJoinCall(signal.workspaceId, signal.channelId, name);
  const pending = decline.isPending || join.isPending;

  function handleDecline() {
    decline.mutate(signal, {
      onError: () => toast.error('Не вдалося відхилити дзвінок.'),
    });
  }

  function handleAccept() {
    join.mutate(signal.callId, {
      onError: () => toast.error('Не вдалося приєднатися до дзвінка.'),
    });
  }

  return (
    <div className={styles.card} role="alertdialog" aria-label={`Вхідний дзвінок від ${name}`}>
      <Avatar path={signal.startedByAvatarPath} alt={name} size={44} shape="circle" />
      <div className={styles.info}>
        <span className={styles.name}>{name}</span>
        <span className={styles.status}>Вхідний дзвінок</span>
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          className={cx(styles.circleButton, styles.decline)}
          aria-label="Відхилити дзвінок"
          disabled={pending}
          onClick={handleDecline}
        >
          {decline.isPending ? <LoadingOutlined /> : <PhoneXIcon size={20} weight="fill" />}
        </button>
        <button
          type="button"
          className={cx(styles.circleButton, styles.accept)}
          aria-label="Прийняти дзвінок"
          disabled={pending}
          onClick={handleAccept}
        >
          {join.isPending ? <LoadingOutlined /> : <PhoneIcon size={20} weight="fill" />}
        </button>
      </div>
    </div>
  );
}
