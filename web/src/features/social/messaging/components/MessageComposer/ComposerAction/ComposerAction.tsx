import { PaperPlaneRightIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';

const useStyles = createStyles(({ token, css }) => ({
  button: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 52px;
    flex-shrink: 0;
    border: 0;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(20px) saturate(1.7);
    box-shadow: 0 1px 2px rgba(23, 46, 42, 0.12);
    color: ${token.colorTextQuaternary};
    cursor: not-allowed;
    transition:
      background 0.15s ease,
      color 0.15s ease,
      transform 0.15s ease;

    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: 2px;
    }

    @media (max-width: ${token.screenMD}px) {
      width: 46px;
      height: 46px;
      border-radius: 14px;
    }
  `,
  ready: css`
    background: ${token.colorPrimary};
    color: ${token.colorWhite};
    cursor: pointer;

    &:hover {
      background: ${token.colorPrimaryHover};
    }

    &:active {
      transform: scale(0.94);
    }
  `,
}));

interface ComposerActionProps {
  hasContent: boolean;
  onSend: () => void;
}

export function ComposerAction({ hasContent, onSend }: ComposerActionProps) {
  const { styles, cx } = useStyles();

  return (
    <button
      type="button"
      className={cx(styles.button, hasContent && styles.ready)}
      aria-label="Надіслати"
      disabled={!hasContent}
      onClick={onSend}
    >
      <PaperPlaneRightIcon size={22} weight={hasContent ? 'fill' : 'regular'} />
    </button>
  );
}
