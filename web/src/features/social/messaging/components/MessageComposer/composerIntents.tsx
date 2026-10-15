import type { ComponentType } from 'react';

import type { ComposerIntent } from '@/features/social/conversation-scope/store';
import { writeToken } from '@/features/social/mentions/mention-tokens';
import type { ComposerDraft } from '@/features/social/mentions/types';
import type { MemberSummary } from '@/features/workspaces/types';

import type { SendMessageCommand } from '../../types';
import { AskExcerpt } from '../AskExcerpt/AskExcerpt';
import { ReplyExcerpt } from '../ReplyExcerpt/ReplyExcerpt';

type Intent = NonNullable<ComposerIntent>;
type IntentKind = Intent['kind'];
type IntentOf<K extends IntentKind> = Extract<Intent, { kind: K }>;

type IntentMessage = Pick<
  SendMessageCommand,
  'markdown' | 'labels' | 'replyToMessageId' | 'quoteText'
>;

export interface IntentExcerptProps<T> {
  intent: T;
  /** What the composer knows of the message a reply answers. */
  replyAuthor?: string;
  replyPreview?: string;
}

interface ComposerIntentBehaviour<T> {
  Excerpt: ComponentType<IntentExcerptProps<T>>;
  cancelLabel: string;
  /** The intent says enough to send without words of the person's own. */
  speaksForItself: boolean;
  /** The message the composer sends for the person's words under this intent. */
  compose: (intent: T, draft: ComposerDraft) => IntentMessage;
}

const composerIntents: { [K in IntentKind]: ComposerIntentBehaviour<IntentOf<K>> } = {
  reply: {
    Excerpt: ({ intent, replyAuthor, replyPreview }) => (
      <ReplyExcerpt
        title={intent.quoteText ? 'Цитата' : `Відповідь для ${replyAuthor ?? 'учасника'}`}
        markdown={replyPreview ?? 'Повідомлення'}
        quoteText={intent.quoteText}
      />
    ),
    cancelLabel: 'Скасувати відповідь',
    speaksForItself: false,
    compose: (intent, { markdown, labels }) => ({
      markdown,
      labels,
      replyToMessageId: intent.messageId,
      ...(intent.quoteText ? { quoteText: intent.quoteText } : {}),
    }),
  },
  ask: {
    Excerpt: ({ intent }) => <AskExcerpt member={intent.member} count={intent.messageIds.length} />,
    cancelLabel: 'Скасувати запит',
    speaksForItself: true,
    compose: (intent, draft) => addressedTo(intent.member, draft),
  },
};

/** What the composer shows of the intent above the person's words. */
export function IntentExcerpt({ intent, ...reply }: IntentExcerptProps<Intent>) {
  const { Excerpt } = composerIntent(intent.kind);
  return <Excerpt intent={intent} {...reply} />;
}

export function composerIntent<K extends IntentKind>(
  kind: K,
): ComposerIntentBehaviour<IntentOf<K>> {
  return composerIntents[kind];
}

/** The message mentions whom it asks, unless the person already did. */
function addressedTo(member: MemberSummary, { markdown, labels }: ComposerDraft): IntentMessage {
  const mention = writeToken({ kind: 'member', id: member.memberId });
  const named = { ...labels, [member.memberId]: member.displayName ?? '' };
  if (markdown.includes(mention)) return { markdown, labels: named };

  return { markdown: markdown ? `${mention} ${markdown}` : mention, labels: named };
}
