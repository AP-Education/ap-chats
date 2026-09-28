import { PaperPlaneRightIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';

const useStyles = createStyles(({ token, css }) => ({
  button: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    border: 0;
    border-radius: 6px;
    background: transparent;
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
      width: 44px;
      height: 44px;
    }
  `,
  ready: css`
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimary};
    cursor: pointer;

    &:hover {
      background: ${token.colorPrimaryBgHover};
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
