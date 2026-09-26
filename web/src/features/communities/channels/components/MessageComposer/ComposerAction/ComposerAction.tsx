import { MicrophoneIcon, PaperPlaneRightIcon } from '@phosphor-icons/react';
import { Tooltip } from 'antd';
import { createStyles } from 'antd-style';

import { useMicrophonePermission } from './useMicrophonePermission';

const useStyles = createStyles(({ token, css }) => ({
  button: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 54px;
    height: 54px;
    flex-shrink: 0;
    border: 0;
    border-radius: 12px;
    background: ${token.colorFillSecondary};
    color: ${token.colorTextQuaternary};
    cursor: not-allowed;
    transition:
      background 0.15s ease,
      color 0.15s ease;

    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: 2px;
    }

    @media (max-width: ${token.screenMD}px) {
      width: 52px;
      height: 52px;
      border-radius: 14px;
    }
  `,
  ready: css`
    background: ${token.colorPrimary};
    color: #fff;
    cursor: pointer;

    &:hover {
      background: ${token.colorPrimaryHover};
    }
  `,
}));

interface ComposerActionProps {
  hasContent: boolean;
  onSend: () => void;
  onRecordAudio: () => void;
}

export function ComposerAction({ hasContent, onSend, onRecordAudio }: ComposerActionProps) {
  const { styles, cx } = useStyles();
  const microphoneGranted = useMicrophonePermission();

  if (!hasContent && microphoneGranted) {
    return (
      <Tooltip title="Записати аудіо">
        <button
          type="button"
          className={cx(styles.button, styles.ready)}
          aria-label="Записати аудіо"
          onClick={onRecordAudio}
        >
          <MicrophoneIcon size={24} />
        </button>
      </Tooltip>
    );
  }

  return (
    <button
      type="button"
      className={cx(styles.button, hasContent && styles.ready)}
      aria-label="Надіслати"
      disabled={!hasContent}
      onClick={onSend}
    >
      <PaperPlaneRightIcon size={24} weight={hasContent ? 'duotone' : 'regular'} />
    </button>
  );
}
