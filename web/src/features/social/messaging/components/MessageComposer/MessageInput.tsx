import { isNativeShell } from '@ap-education/shell-sdk';
import {
  type ComposerEditorSlot,
  ComposerEditorSlotContext,
  useComposer,
  useComposerEditorSlot,
  useComposerPart,
} from '@ap-education/timeline/composer';
import { type ReactNode, useMemo } from 'react';

import { useConversationExtensions } from '@/features/social/conversation-scope/extensions';
import { useConversation } from '@/features/social/conversation-scope/store';

import { gifBlock } from '../../gifs/klipy-items';
import { withPlaceholder } from '../../gifs/linked-gif';
import type { PickedGif } from '../../gifs/types';
import type { ComposedMessage } from '../../types';
import { ComposerPicker, NativePickerTrigger, useLastPickerTab } from './ComposerPicker';
import styles from './MessageComposer.module.css';
import { useComposerBlurRequests } from './useComposerBlurRequests';
import { useNativeComposerInput } from './useNativeComposerInput';

/** Hands a message to the send queue, which lets sends out in the order they were written. */
export type SendInTurn = (nonce: string, prepare: () => Promise<ComposedMessage>) => void;

interface MessageInputProps {
  sendInTurn: SendInTurn;
  /** The editor, such as `<MentionEditor />`. */
  children: ReactNode;
}

/**
 * The words and, beside them, the picker that stands in for the keyboard: the composer's own panel
 * on the web, the shell's in the app.
 */
export function MessageInput({ sendInTurn, children }: MessageInputProps) {
  const { compose, blur } = useComposer();
  const setIntent = useConversation((state) => state.setIntent);
  useComposerBlurRequests(blur);

  // A picked GIF goes out at once as its link with the GIF already found, as on Discord; the
  // words stay for the next message.
  function sendGif(gif: PickedGif) {
    const block = gifBlock(gif);
    const { message, nonce } = compose({ markdown: block.link, labels: {} });
    sendInTurn(nonce, async () => {
      const found = await withPlaceholder(block, gif.placeholder ?? undefined);
      return { ...message, blocks: [found] };
    });
    // What the GIF answered went out with it.
    setIntent(null);
  }

  if (isNativeShell()) {
    return <NativeMessageInput onPickGif={sendGif}>{children}</NativeMessageInput>;
  }

  return (
    <>
      {children}
      <ComposerToolbar>
        <ComposerPicker onPickGif={sendGif} />
      </ComposerToolbar>
    </>
  );
}

interface NativeMessageInputProps {
  onPickGif: (gif: PickedGif) => void;
  children: ReactNode;
}

function NativeMessageInput({ onPickGif, children }: NativeMessageInputProps) {
  const slot = useComposerEditorSlot();
  const { insertText } = useComposer();
  const [lastTab, rememberTab] = useLastPickerTab();
  const picker = useNativeComposerInput({
    draftKey: slot.draftKey,
    onInsert: insertText,
    onGif: pickGif,
    onTab: rememberTab,
  });
  const isOpen = picker.activeTab !== null;

  function pickGif(gif: PickedGif) {
    onPickGif(gif);
    picker.close();
  }

  // Escape puts the shell's picker away before it drops a reply.
  useComposerPart({ cancel: isOpen ? picker.close : undefined });
  useComposerBlurRequests(picker.close);

  // The composer hears taps on the words only for its own panels; with the shell's picker up, the
  // shell brings its keyboard back itself, the caret where the finger landed.
  const editorSlot = useMemo<ComposerEditorSlot>(
    () => ({
      ...slot,
      onPointerDown: (event) => {
        if (!picker.activeTab) return slot.onPointerDown?.(event);

        event.preventDefault();
        picker.keyboard({ x: event.clientX, y: event.clientY });
      },
    }),
    [slot, picker],
  );

  return (
    <>
      <ComposerEditorSlotContext value={editorSlot}>{children}</ComposerEditorSlotContext>
      <ComposerToolbar>
        <NativePickerTrigger
          isOpen={isOpen}
          onToggle={() => (isOpen ? picker.keyboard() : picker.open(lastTab))}
        />
      </ComposerToolbar>
    </>
  );
}

/** Beside the words: what the features extending the conversation add, then the picker. */
function ComposerToolbar({ children }: { children: ReactNode }) {
  const extensions = useConversationExtensions();

  return (
    <div className={styles.toolbar}>
      {extensions.map(
        ({ id, ComposerAccessory }) => ComposerAccessory && <ComposerAccessory key={id} />,
      )}
      {children}
    </div>
  );
}
