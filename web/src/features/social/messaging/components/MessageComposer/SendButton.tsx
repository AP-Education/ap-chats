import { ComposerSend, type HoldPointer, useComposer } from '@ap-education/timeline/composer';
import { Dropdown, type MenuProps } from 'antd';
import { useMemo, useState } from 'react';

import {
  type ComposerCommands,
  type SendOption,
  useConversationExtensions,
} from '@/features/social/conversation-scope/extensions';
import { useConversation } from '@/features/social/conversation-scope/store';

import { composerIntent } from './composerIntents';

interface SendButtonProps {
  /** Files wait to go with the message, which not every other way to send can take. */
  hasAttachments: boolean;
}

/** Sends on a click; a right click lists the other ways to send, a long press takes the only one. */
export function SendButton({ hasAttachments }: SendButtonProps) {
  const extensions = useConversationExtensions();
  const options = useMemo(
    () => extensions.flatMap((extension) => extension.sendOptions ?? []),
    [extensions],
  );
  const intent = useConversation((state) => state.intent);
  const { canSend, compose, clear } = useComposer();
  const [menuOpen, setMenuOpen] = useState(false);
  const [chosen, setChosen] = useState<SendOption | null>(null);

  if (!options.length) return <ComposerSend />;

  const draft = { hasAttachments, canWait: !intent || composerIntent(intent.kind).canWait };
  // Other ways to send take the draft over through these, and decide its fate themselves.
  const composer: ComposerCommands = { read: () => compose().message, clear };

  // A mouse has its right click for the menu; a finger holds the button instead and takes the
  // only option at once. With several, or one that cannot take this draft, the menu opens to say
  // which can and why the others can't.
  function hold(pointer: HoldPointer) {
    const [only] = options;
    const takesDraft =
      pointer === 'finger' && options.length === 1 && only && !only.unavailable?.(draft);
    if (takesDraft) setChosen(only);
    else setMenuOpen(true);
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

  const Dialog = chosen?.Dialog;

  return (
    <>
      <Dropdown
        trigger={['contextMenu']}
        menu={menu}
        open={menuOpen && canSend}
        onOpenChange={setMenuOpen}
        placement="topRight"
      >
        <ComposerSend onHold={hold} />
      </Dropdown>
      {Dialog && <Dialog composer={composer} onClose={() => setChosen(null)} />}
    </>
  );
}
