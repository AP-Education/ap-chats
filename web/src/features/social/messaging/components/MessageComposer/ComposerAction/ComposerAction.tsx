import { PaperPlaneRightIcon } from '@phosphor-icons/react';
import { Dropdown, type MenuProps } from 'antd';
import { type PointerEvent, useRef, useState } from 'react';

import type {
  ComposerCommands,
  ComposerDraftState,
  SendOption,
} from '@/features/social/conversation-scope/extensions';

import styles from './ComposerAction.module.css';

const LONG_PRESS_MS = 400;

interface ComposerActionProps {
  hasContent: boolean;
  onSend: () => void;
  /** Other ways to send, from the features extending the conversation. */
  options: SendOption[];
  draft: ComposerDraftState;
  composer: ComposerCommands;
}

/** Sends on a click; a right click lists the other ways to send, a long press takes the only one. */
export function ComposerAction({
  hasContent,
  onSend,
  options,
  draft,
  composer,
}: ComposerActionProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [chosen, setChosen] = useState<SendOption | null>(null);
  const pressTimer = useRef<number | undefined>(undefined);
  const pressedLong = useRef(false);
  const hasOptions = options.length > 0 && hasContent;

  // A mouse has its right click; a finger holds the button instead. With several options, or
  // one that cannot take this draft, the menu opens to say which do and why the others don't.
  function startPress(event: PointerEvent<HTMLButtonElement>) {
    pressedLong.current = false;
    if (!hasOptions || event.pointerType === 'mouse') return;

    pressTimer.current = window.setTimeout(() => {
      pressedLong.current = true;
      const [only] = options;
      const takesDraft = options.length === 1 && only && !only.unavailable?.(draft);
      if (takesDraft) setChosen(only);
      else setMenuOpen(true);
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
    items: options.map((option) => {
      const reason = option.unavailable?.(draft);
      return {
        key: option.id,
        icon: option.icon,
        label: reason ?? option.label,
        disabled: !!reason,
      };
    }),
    onClick: ({ key }) => {
      setMenuOpen(false);
      setChosen(options.find((option) => option.id === key) ?? null);
    },
  };

  const button = (
    <button
      type="button"
      className={styles.button}
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

  if (!options.length) return button;

  const Dialog = chosen?.Dialog;

  return (
    <>
      <Dropdown
        trigger={['contextMenu']}
        menu={menu}
        open={menuOpen && hasOptions}
        onOpenChange={setMenuOpen}
        placement="topRight"
      >
        {button}
      </Dropdown>
      {Dialog && <Dialog composer={composer} onClose={() => setChosen(null)} />}
    </>
  );
}
