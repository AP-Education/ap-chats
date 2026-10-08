import { PhoneOutgoingIcon, UsersThreeIcon } from '@phosphor-icons/react';
import { createStyles, keyframes } from 'antd-style';

import { RingingAvatar } from '../../RingingAvatar/RingingAvatar';
import type { Callee } from './useCallStageParticipants';

const fadeIn = keyframes`
  from { opacity: 0; transform: scale(0.94); }
  to { opacity: 1; transform: scale(1); }
`;

const useStyles = createStyles(({ token, css }) => ({
  stage: css`
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    min-height: 0;
    padding: ${token.paddingLG}px;
  `,
  waiting: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: ${token.paddingXS}px;
    text-align: center;
    animation: ${fadeIn} 0.25s ease-out;
  `,
  name: css`
    margin-top: ${token.marginLG}px;
    color: ${token.colorText};
    font-size: ${token.fontSizeHeading3}px;
    font-weight: 650;
  `,
  status: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: ${token.paddingXXS}px ${token.paddingSM}px;
    border-radius: 999px;
    background: ${token.colorFillSecondary};
    backdrop-filter: blur(16px);
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSizeSM}px;
    font-weight: 550;
  `,
  placeholder: css`
    display: grid;
    place-items: center;
    width: 128px;
    height: 128px;
    border-radius: 50%;
    background: ${token.colorFillSecondary};
    color: ${token.colorTextSecondary};
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
          <RingingAvatar path={callee.avatarPath} alt={callee.name} size={128} />
          <span className={styles.name}>{callee.name}</span>
          <span className={styles.status}>
            <PhoneOutgoingIcon size={14} weight="fill" />
            Дзвонимо
          </span>
        </div>
      </div>
    );

  return (
    <div className={styles.stage}>
      <div className={styles.waiting}>
        <span className={styles.placeholder}>
          <UsersThreeIcon size={56} weight="light" />
        </span>
        <span className={styles.status}>Очікуємо на учасників</span>
      </div>
    </div>
  );
}
