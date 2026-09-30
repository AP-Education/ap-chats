import { LoadingOutlined } from '@ant-design/icons';
import { PhoneCallIcon, PhoneDisconnectIcon } from '@phosphor-icons/react';
import { message as toast } from 'antd';
import { createStyles, keyframes } from 'antd-style';

import { Avatar } from '@/shared/ui/Avatar/Avatar';

import { CALL_SURFACE_GRADIENT, CALL_SURFACE_HIGHLIGHT } from '../callTheme';
import { useDeclineIncomingCall } from '../hooks/useDeclineIncomingCall';
import { useIncomingCallRingtone } from '../hooks/useIncomingCallRingtone';
import { useJoinCall } from '../hooks/useJoinCall';
import type { CallSignal } from '../schemas';

const scrimIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

// A gentle spring overshoot rather than a linear rise: it lands with a touch
// of bounce, the way a native incoming-call sheet does.
const bounceIn = keyframes`
  0% { opacity: 0; transform: scale(0.55); }
  60% { opacity: 1; transform: scale(1.04); }
  80% { transform: scale(0.98); }
  100% { transform: scale(1); }
`;

const shake = keyframes`
  0%, 100% { transform: rotate(0deg); }
  15% { transform: rotate(-12deg); }
  30% { transform: rotate(10deg); }
  45% { transform: rotate(-8deg); }
  60% { transform: rotate(6deg); }
  75% { transform: rotate(-3deg); }
  90% { transform: rotate(2deg); }
`;

const sonar = keyframes`
  0% { transform: scale(1); opacity: 0.5; }
  100% { transform: scale(1.7); opacity: 0; }
`;

const drift = keyframes`
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.55; }
  50% { transform: translate(-50%, -50%) scale(1.15); opacity: 0.85; }
`;

const acceptPulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(82, 196, 26, 0.45); }
  70% { box-shadow: 0 0 0 14px rgba(82, 196, 26, 0); }
  100% { box-shadow: 0 0 0 0 rgba(82, 196, 26, 0); }
`;

const useStyles = createStyles(({ token, css }) => ({
  scrim: css`
    position: fixed;
    inset: 0;
    z-index: 1400;
    display: grid;
    place-items: center;
    padding: 20px;
    background: rgba(4, 12, 11, 0.6);
    backdrop-filter: blur(6px);
    animation: ${scrimIn} ${token.motionDurationMid} ${token.motionEaseOut};
  `,
  card: css`
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    width: 100%;
    max-width: 328px;
    padding: 60px 36px 40px;
    overflow: hidden;
    border-radius: 28px;
    background: ${CALL_SURFACE_GRADIENT};
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.4);
    color: ${token.colorWhite};
    text-align: center;
    animation: ${bounceIn} 0.55s cubic-bezier(0.34, 1.56, 0.64, 1);
  `,
  nebula: css`
    position: absolute;
    top: 30%;
    left: 50%;
    z-index: 0;
    width: 260px;
    height: 260px;
    background: radial-gradient(circle, ${CALL_SURFACE_HIGHLIGHT}55, transparent 70%);
    animation: ${drift} 5s ease-in-out infinite;
  `,
  avatarWrap: css`
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 124px;
    height: 124px;
  `,
  sonarRing: css`
    position: absolute;
    inset: 0;
    border: 2px solid ${CALL_SURFACE_HIGHLIGHT};
    border-radius: 50%;
    animation: ${sonar} 2.2s ease-out infinite;
  `,
  avatarShake: css`
    display: flex;
    animation: ${shake} 2.6s ease-in-out infinite;
    animation-delay: 0.5s;
  `,
  name: css`
    z-index: 1;
    margin-top: 26px;
    font-size: 21px;
    font-weight: 650;
  `,
  status: css`
    z-index: 1;
    margin-top: 3px;
    font-size: ${token.fontSizeSM}px;
    color: rgba(255, 255, 255, 0.65);
  `,
  actions: css`
    z-index: 1;
    display: flex;
    justify-content: center;
    gap: 44px;
    margin-top: 40px;
  `,
  action: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  `,
  circleButton: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    transition:
      transform ${token.motionDurationFast} ease,
      box-shadow ${token.motionDurationFast} ease;

    &:hover:not(:disabled) {
      transform: scale(1.08);
    }

    &:active:not(:disabled) {
      transform: scale(0.96);
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
  `,
  decline: css`
    background: ${token.colorError};
    color: ${token.colorWhite};

    &:hover:not(:disabled) {
      background: ${token.colorErrorHover};
    }
  `,
  accept: css`
    background: ${token.colorSuccess};
    color: ${token.colorWhite};
    animation: ${acceptPulse} 1.8s ease-out infinite;

    &:hover:not(:disabled) {
      background: ${token.colorSuccessActive};
    }
  `,
  actionLabel: css`
    font-size: ${token.fontSizeSM}px;
    color: rgba(255, 255, 255, 0.65);
  `,
}));

interface IncomingCallCardProps {
  signal: CallSignal;
}

export function IncomingCallCard({ signal }: IncomingCallCardProps) {
  const { styles, cx } = useStyles();
  useIncomingCallRingtone();
  const decline = useDeclineIncomingCall();
  const name = signal.startedByDisplayName ?? 'Колега';
  const join = useJoinCall(signal.workspaceId, signal.channelId, name, signal.startedByAvatarPath);
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
    <div className={styles.scrim}>
      <div className={styles.card} role="alertdialog" aria-label={`Вхідний дзвінок від ${name}`}>
        <span className={styles.nebula} aria-hidden />
        <div className={styles.avatarWrap}>
          <span className={styles.sonarRing} aria-hidden />
          <span className={styles.sonarRing} style={{ animationDelay: '0.7s' }} aria-hidden />
          <span className={styles.avatarShake}>
            <Avatar path={signal.startedByAvatarPath} alt={name} size={100} shape="circle" />
          </span>
        </div>
        <span className={styles.name}>{name}</span>
        <span className={styles.status}>Вхідний дзвінок</span>
        <div className={styles.actions}>
          <span className={styles.action}>
            <button
              type="button"
              className={cx(styles.circleButton, styles.decline)}
              aria-label="Відхилити дзвінок"
              disabled={pending}
              onClick={handleDecline}
            >
              {decline.isPending ? (
                <LoadingOutlined />
              ) : (
                <PhoneDisconnectIcon size={24} weight="fill" />
              )}
            </button>
            <span className={styles.actionLabel}>Відхилити</span>
          </span>
          <span className={styles.action}>
            <button
              type="button"
              className={cx(styles.circleButton, styles.accept)}
              aria-label="Прийняти дзвінок"
              disabled={pending}
              onClick={handleAccept}
            >
              {join.isPending ? <LoadingOutlined /> : <PhoneCallIcon size={24} weight="fill" />}
            </button>
            <span className={styles.actionLabel}>Прийняти</span>
          </span>
        </div>
      </div>
    </div>
  );
}
