import { CaretDownIcon } from '@phosphor-icons/react';
import { createStyles, keyframes } from 'antd-style';

import { CallControls } from './CallControls';
import { CallStage } from './CallStage';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const useStyles = createStyles(({ css }) => ({
  screen: css`
    display: flex;
    flex-direction: column;
    height: 100%;
    background: radial-gradient(circle at 50% 0%, #23262b, #101114 65%);
    animation: ${fadeIn} 0.2s ease-out;
  `,
  header: css`
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
    padding-top: 28px;
    color: rgba(255, 255, 255, 0.92);
    text-align: center;
  `,
  title: css`
    font-size: 18px;
    font-weight: 650;
  `,
  duration: css`
    min-height: 20px;
    color: rgba(255, 255, 255, 0.55);
    font-size: 13px;
  `,
  minimize: css`
    position: absolute;
    top: 16px;
    right: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;

    &:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
    }
  `,
}));

interface CallScreenProps {
  title: string;
  duration: string;
  workspaceId: string;
  onMinimize: () => void;
}

export function CallScreen({ title, duration, workspaceId, onMinimize }: CallScreenProps) {
  const { styles } = useStyles();

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.minimize}
          aria-label="Згорнути дзвінок"
          onClick={onMinimize}
        >
          <CaretDownIcon size={20} />
        </button>
        <span className={styles.title}>{title}</span>
        <span className={styles.duration}>{duration || 'З’єднуємось'}</span>
      </div>
      <CallStage workspaceId={workspaceId} />
      <CallControls />
    </div>
  );
}
