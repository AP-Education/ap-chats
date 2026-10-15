import { CalendarDotsIcon, PaperPlaneRightIcon } from '@phosphor-icons/react';
import { Dropdown, type MenuProps } from 'antd';
import { createStyles } from 'antd-style';
import { type PointerEvent, useRef, useState } from 'react';

const LONG_PRESS_MS = 400;

const useStyles = createStyles(({ token, css }) => ({
  button: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 52px;
    flex-shrink: 0;
    border: 0;
    border-radius: var(--composer-control-radius, ${token.borderRadiusLG}px);
    background: var(--glass, rgba(255, 255, 255, 0.86));
    backdrop-filter: var(--glass-blur, blur(24px) saturate(1.5));
    box-shadow: 0 1px 2px rgba(23, 46, 42, 0.12);
    color: ${token.colorTextQuaternary};
    cursor: not-allowed;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    transition:
      background 0.15s ease,
      color 0.15s ease,
      transform 0.15s ease;

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
  /** Offered on a long press or a right click, as Telegram offers its send options. */
  onSchedule?: () => void;
  canSchedule?: boolean;
}

export function ComposerAction({
  hasContent,
  onSend,
  onSchedule,
  canSchedule = false,
}: ComposerActionProps) {
  const { styles, cx } = useStyles();
  const [menuOpen, setMenuOpen] = useState(false);
  const pressTimer = useRef<number | undefined>(undefined);
  const pressedLong = useRef(false);
  const hasOptions = Boolean(onSchedule) && hasContent;

  // A mouse has its right click; a finger holds the button instead.
  function startPress(event: PointerEvent<HTMLButtonElement>) {
    pressedLong.current = false;
    if (!hasOptions || event.pointerType === 'mouse') return;

    pressTimer.current = window.setTimeout(() => {
      pressedLong.current = true;
      setMenuOpen(true);
    }, LONG_PRESS_MS);
  }

  function endPress() {
    window.clearTimeout(pressTimer.current);
  }

  // The press that opened the options does not also send.
  function handleClick() {
    if (!pressedLong.current) onSend();
  }

  const menu: MenuProps = {
    items: [
      {
        key: 'schedule',
        icon: <CalendarDotsIcon size={18} />,
        label: canSchedule ? 'Запланувати повідомлення' : 'Файли поки не можна запланувати',
        disabled: !canSchedule,
      },
    ],
    onClick: () => {
      setMenuOpen(false);
      onSchedule?.();
    },
  };

  const button = (
    <button
      type="button"
      className={cx(styles.button, hasContent && styles.ready)}
      aria-label="Надіслати"
      disabled={!hasContent}
      onPointerDown={startPress}
      onPointerUp={endPress}
      onPointerLeave={endPress}
      onPointerCancel={endPress}
      onClick={handleClick}
    >
      <PaperPlaneRightIcon size={22} weight={hasContent ? 'fill' : 'regular'} />
    </button>
  );

  if (!onSchedule) return button;

  return (
    <Dropdown
      trigger={['contextMenu']}
      menu={menu}
      open={menuOpen && hasOptions}
      onOpenChange={setMenuOpen}
      placement="topRight"
    >
      {button}
    </Dropdown>
  );
}
