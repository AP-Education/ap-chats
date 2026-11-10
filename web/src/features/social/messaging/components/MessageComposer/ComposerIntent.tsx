import { type ComposerDraft, useComposer, useComposerPart } from '@ap-education/timeline/composer';
import { IconButton } from '@ap-education/ui';
import { XIcon } from '@phosphor-icons/react';
import { useEffectEvent, useLayoutEffect } from 'react';

import { useConversation } from '@/features/social/conversation-scope/store';

import { composerIntent, IntentExcerpt, type ReplyPreview } from './composerIntents';
import styles from './MessageComposer.module.css';

interface ComposerIntentProps {
  /** What the composer knows of the message a reply answers. */
  replyAuthor?: string | undefined;
  replyPreview?: ReplyPreview | undefined;
}

/** What the message answers or asks, above the words: it goes out with them, and Escape drops it. */
export function ComposerIntent({ replyAuthor, replyPreview }: ComposerIntentProps) {
  const intent = useConversation((state) => state.intent);
  const setIntent = useConversation((state) => state.setIntent);
  const { focus } = useComposer();
  const focusWords = useEffectEvent(focus);
  const dropIntent = () => setIntent(null);

  useComposerPart<ComposerDraft>({
    hasContent: Boolean(intent && composerIntent(intent.kind).speaksForItself),
    compose: intent
      ? (message) => ({ ...message, ...composerIntent(intent.kind).compose(intent, message) })
      : undefined,
    cancel: intent ? dropIntent : undefined,
    clear: dropIntent,
  });

  useLayoutEffect(() => {
    if (intent) focusWords();
  }, [intent]);

  if (!intent) return null;

  return (
    <div className={styles.intent}>
      <IntentExcerpt intent={intent} replyAuthor={replyAuthor} replyPreview={replyPreview} />
      <IconButton
        size={28}
        aria-label={composerIntent(intent.kind).cancelLabel}
        onClick={dropIntent}
      >
        <XIcon size={16} />
      </IconButton>
    </div>
  );
}
