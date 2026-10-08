import { PhoneOutgoingIcon, UserIcon } from '@phosphor-icons/react';
import { createStyles, keyframes } from 'antd-style';

import { Avatar } from '@/shared/ui/Avatar';

import type { Callee } from './useCallStageParticipants';

const fadeIn = keyframes`
  from { opacity: 0; transform: scale(0.94); }
  to { opacity: 1; transform: scale(1); }
`;

const breathe = keyframes`
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
`;

const useStyles = createStyles(({ css }) => ({
  stage: css`
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    min-height: 0;
    padding: 24px;
  `,
  waiting: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    color: rgba(255, 255, 255, 0.55);
    animation: ${fadeIn} 0.25s ease-out;
  `,
  ring: css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 160px;
    height: 160px;
    border: 2px dashed rgba(255, 255, 255, 0.22);
    border-radius: 50%;
    animation: ${breathe} 2.2s ease-in-out infinite;
  `,
  label: css`
    font-size: 14px;
  `,
  calleeName: css`
    font-size: 24px;
    font-weight: 650;
    color: rgba(255, 255, 255, 0.95);
  `,
  calleeStatus: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 2px;
    padding: 5px 14px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.8);
    font-size: 13px;
    font-weight: 550;
  `,
}));

interface WaitingStageProps {
  callee?: Callee;
}

/** Nobody else has joined yet. When this is a DM, that's someone specific —
 * their avatar and name, not a generic placeholder, the way FaceTime shows
 * exactly who you're calling while it rings. Falls back to a plain waiting
 * state for channel calls, which have no single person to show. */
export function WaitingStage({ callee }: WaitingStageProps) {
  const { styles } = useStyles();

  if (callee)
    return (
      <div className={styles.stage}>
        <div className={styles.waiting}>
          <span className={styles.ring}>
            <Avatar path={callee.avatarPath} alt={callee.name} size={128} shape="circle" />
          </span>
          <span className={styles.calleeName}>{callee.name}</span>
          <span className={styles.calleeStatus}>
            <PhoneOutgoingIcon size={14} weight="fill" />
            Дзвонимо
          </span>
        </div>
      </div>
    );

  return (
    <div className={styles.stage}>
      <div className={styles.waiting}>
        <span className={styles.ring}>
          <UserIcon size={56} weight="light" />
        </span>
        <span className={styles.label}>Очікуємо на учасника</span>
      </div>
    </div>
  );
}
