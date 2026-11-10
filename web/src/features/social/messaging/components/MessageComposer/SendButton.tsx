import { ComposerSend, type HoldPointer, useComposer } from '@ap-education/timeline/composer';
import { Dropdown, type MenuProps } from 'antd';
import { useMemo, useRef, useState, useSyncExternalStore } from 'react';

import {
  type ComposerCommands,
  type SendOption,
  useConversationExtensions,
} from '@/features/social/conversation-scope/extensions';
import { useConversation, useConversationScope } from '@/features/social/conversation-scope/store';
import { randomId } from '@/shared/lib/random-id';

import type { Attachment } from '../../attachments/types';
import { useConversationSending } from '../../sending/hooks/useConversationSending';
import type { ComposedMessage } from '../../types';
import { composerIntent } from './composerIntents';
import styles from './MessageComposer.module.css';

/** Sends on a click; a right click lists the other ways to send, a long press takes the only one. */
export function SendButton({ privateAssistant = false }: { privateAssistant?: boolean }) {
  const { workspaceId, channelId } = useConversationScope();
  const { uploads } = useConversationSending(workspaceId, channelId);
  const files = useSyncExternalStore(uploads.subscribe, uploads.getSnapshot);
  const extensions = useConversationExtensions();
  const options = useMemo(
    () => extensions.flatMap((extension) => extension.sendOptions ?? []),
    [extensions],
  );
  const intent = useConversation((state) => state.intent);
  const { canSend, compose, clear } = useComposer();
  const [menuOpen, setMenuOpen] = useState(false);
  const [chosen, setChosen] = useState<SendOption | null>(null);
  const scheduleAttempt = useRef<{ draft: string; nonce: string }>(null);

  if (!options.length) return canSend ? <ComposerSend className={styles.sendAction} /> : null;

  const draft = {
    attachmentsReady: files.every((file) => file.status === 'ready'),
    canWait: !privateAssistant && (!intent || composerIntent(intent.kind).canWait),
  };
  // Other ways to send take the draft over through these, and decide its fate themselves.
  const composer: ComposerCommands = {
    read: () => {
      const { message } = compose();
      const composed = message as ComposedMessage;
      if (composed.assistant) return null;

      const attachments: Attachment[] = [];
      for (const file of uploads.getSnapshot()) {
        if (file.status !== 'ready' || !file.attachment) return null;
        attachments.push({ ...file.attachment, description: file.description || null });
      }
      const input = { ...composed, attachments };
      const draftKey = JSON.stringify(input);
      const previous = scheduleAttempt.current;
      const nonce = previous?.draft === draftKey ? previous.nonce : randomId();
      scheduleAttempt.current = { draft: draftKey, nonce };
      return { ...input, clientNonce: nonce };
    },
    clear: (input) => {
      const ids = new Set(input.attachments?.map((file) => file.id));
      const keys = uploads
        .getSnapshot()
        .filter((file) => file.attachment && ids.has(file.attachment.id))
        .map((file) => file.key);
      uploads.releaseDrafts(keys);
      scheduleAttempt.current = null;
      clear();
    },
  };

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
      {canSend && (
        <Dropdown
          trigger={['contextMenu']}
          menu={menu}
          open={menuOpen}
          onOpenChange={setMenuOpen}
          placement="topRight"
        >
          <ComposerSend className={styles.sendAction} onHold={hold} />
        </Dropdown>
      )}
      {Dialog && <Dialog composer={composer} onClose={() => setChosen(null)} />}
    </>
  );
}
