import type { ComposerDraft } from '@ap-education/timeline/composer';
import type { TFunction } from 'i18next';
import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';

import type { ComposerIntent } from '@/features/social/conversation-scope/store';
import { writeToken } from '@/features/social/mentions/mention-tokens';
import type { MemberSummary } from '@/features/workspaces/types';

import type { Message, SendMessageCommand } from '../../types';
import { AskExcerpt } from '../AskExcerpt/AskExcerpt';
import { ReplyExcerpt } from '../ReplyExcerpt/ReplyExcerpt';

type Intent = NonNullable<ComposerIntent>;
type IntentKind = Intent['kind'];
type IntentOf<K extends IntentKind> = Extract<Intent, { kind: K }>;

type IntentMessage = Pick<
  SendMessageCommand,
  'markdown' | 'labels' | 'replyToMessageId' | 'quoteText' | 'contextMessageIds'
>;

export interface IntentExcerptProps<T> {
  intent: T;
  /** What the composer knows of the message a reply answers. */
  replyAuthor?: string;
  replyPreview?: ReplyPreview;
}

export type ReplyPreview = Pick<Message, 'markdown' | 'blocks' | 'attachments' | 'privateToMe'>;

interface ComposerIntentBehaviour<T> {
  Excerpt: ComponentType<IntentExcerptProps<T>>;
  cancelLabel: (t: TFunction<'messaging'>) => string;
  /** The intent says enough to send without words of the person's own. */
  speaksForItself: boolean;
  /** The intent still means the same if the message goes out later. */
  canWait: boolean;
  /** The message the composer sends for the person's words under this intent. */
  compose: (intent: T, draft: ComposerDraft) => IntentMessage;
}

const composerIntents: { [K in IntentKind]: ComposerIntentBehaviour<IntentOf<K>> } = {
  reply: {
    Excerpt: ReplyIntentExcerpt,
    cancelLabel: (t) => t(($) => $.composer.cancelReply),
    speaksForItself: false,
    canWait: true,
    compose: (intent, { markdown, labels }) => ({
      markdown,
      labels,
      replyToMessageId: intent.messageId,
      ...(intent.quoteText ? { quoteText: intent.quoteText } : {}),
    }),
  },
  ask: {
    Excerpt: ({ intent }) => <AskExcerpt member={intent.member} count={intent.messageIds.length} />,
    cancelLabel: (t) => t(($) => $.composer.cancelAsk),
    speaksForItself: true,
    // StarMe hears a question only as it goes out, so the question cannot be put off.
    canWait: false,
    compose: (intent, draft) => ({
      ...addressedTo(intent.member, draft),
      contextMessageIds: intent.messageIds,
    }),
  },
};

function ReplyIntentExcerpt({
  intent,
  replyAuthor,
  replyPreview,
}: IntentExcerptProps<IntentOf<'reply'>>) {
  const { t } = useTranslation('messaging');

  return (
    <ReplyExcerpt
      title={
        replyPreview?.privateToMe
          ? t(($) => $.composer.privateReply)
          : intent.quoteText
            ? t(($) => $.composer.quote)
            : t(($) => $.composer.replyTo, {
                name: replyAuthor ?? t(($) => $.composer.replyFallbackName),
              })
      }
      markdown={replyPreview?.markdown ?? t(($) => $.composer.replyFallbackPreview)}
      blocks={replyPreview?.blocks}
      attachments={replyPreview?.attachments}
      quoteText={intent.quoteText}
    />
  );
}

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
