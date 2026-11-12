import {
  Composer,
  ComposerAttach,
  type ComposerDraft,
  ComposerDropZone,
  ComposerField,
  ComposerHeader,
  ComposerUploads,
  ComposerUploadTray,
} from '@ap-education/timeline/composer';
import { Button, message } from 'antd';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useConversationExtensions } from '@/features/social/conversation-scope/extensions';
import {
  type ComposerIntent as ConversationIntent,
  useConversation,
  useConversationScope,
  useConversationStore,
} from '@/features/social/conversation-scope/store';
import { writeToken } from '@/features/social/mentions/mention-tokens';
import { useTypingBroadcast } from '@/features/social/typing/hooks/useTypingBroadcast';

import { useAttachments } from '../../attachments/useAttachments';
import { useLinkedGif } from '../../gifs/useLinkedGif';
import type { ComposedMessage } from '../../types';
import { parseComposerDraft } from './composer-draft';
import { ComposerIntent } from './ComposerIntent';
import type { ReplyPreview } from './composerIntents';
import { ComposerVoice } from './ComposerVoice';
import styles from './MessageComposer.module.css';
import { MessageInput } from './MessageInput';
import { PrivateAssistantMode } from './PrivateAssistantMode';
import { SendButton } from './SendButton';

interface MessageComposerProps {
  replyAuthor?: string;
  replyPreview?: ReplyPreview;
  /** `nonce` names the message, and the composer's files went out under it. */
  onSend: (input: ComposedMessage, nonce: string) => void;
  /** The editor to compose with, such as `<MentionEditor />`, wired by the composer around it. */
  children: ReactNode;
}

export function MessageComposer({
  replyAuthor,
  replyPreview,
  onSend,
  children,
}: MessageComposerProps) {
  const { workspaceId, channelId, composer } = useConversationScope();
  const { notifyTyping, notifyStopped } = useTypingBroadcast(workspaceId, channelId);
  const { identity } = useQueryAuth();
  const draftKey = `ap-chats:draft:${identity}:${workspaceId}:${channelId}`;
  const audienceKey = `${draftKey}:audience`;
  const privateIntent = useConversation((state) => isPrivateIntent(state.intent));
  const conversation = useConversationStore();
  const extensions = useConversationExtensions();
  const assistantMemberId = extensions.find(
    (extension) => extension.privateAssistantMemberId,
  )?.privateAssistantMemberId;
  const assistantMention = assistantMemberId
    ? writeToken({ kind: 'member', id: assistantMemberId })
    : null;
  const [savedPrivateAssistant, setSavedPrivateAssistant] = useState(
    () =>
      localStorage.getItem(audienceKey) === 'private' ||
      parseComposerDraft(localStorage.getItem(draftKey)).assistant,
  );
  const privateAssistant = savedPrivateAssistant || privateIntent;
  const rememberAssistant = useCallback(
    (enabled: boolean) => {
      if (enabled) localStorage.setItem(audienceKey, 'private');
      else localStorage.removeItem(audienceKey);
      setSavedPrivateAssistant(enabled);
    },
    [audienceKey],
  );

  useEffect(
    () =>
      conversation.subscribe((next, previous) => {
        if (next.intent !== previous.intent && isPrivateIntent(next.intent))
          rememberAssistant(true);
      }),
    [conversation, rememberAssistant],
  );

  const labels = useMemo(
    () => ({ field: composer.ariaLabel, placeholder: composer.placeholder }),
    [composer.ariaLabel, composer.placeholder],
  );
  const attachments = useAttachments();
  const linkedGif = useLinkedGif();
  // Sends leave in the order written, though finding a GIF may hold one back for a moment.
  const sendQueue = useRef(Promise.resolve());

  function sendInTurn(nonce: string, prepare: () => Promise<ComposedMessage>) {
    sendQueue.current = sendQueue.current.then(async () => onSend(await prepare(), nonce));
  }

  function send(message: ComposedMessage, nonce: string) {
    notifyStopped();
    if (message.assistant) rememberAssistant(true);

    sendInTurn(nonce, async () => {
      const blocks = await linkedGif.blocksFor(message.markdown);
      return blocks ? { ...message, blocks } : message;
    });
  }

  return (
    <Composer<ComposerDraft & ComposedMessage>
      draftKey={draftKey}
      labels={labels}
      autoFocus={composer.autoFocus}
      onChange={(draft) => {
        const namesAssistant = assistantMention && draft.markdown.includes(assistantMention);
        if (privateAssistant || namesAssistant || !draft.markdown.trim()) notifyStopped();
        else notifyTyping();

        if (
          draft.markdown &&
          (privateIntent || (assistantMention && draft.markdown.includes(assistantMention)))
        )
          rememberAssistant(true);
        linkedGif.prefetch(draft.markdown);
      }}
      onSend={send}
    >
      <ComposerUploads
        queue={attachments.queue}
        policy={attachments.policy}
        onReject={showRejections}
      >
        <ComposerVoice scope={{ workspaceId, channelId }} attachments={attachments} onSend={send}>
          <ComposerDropZone />
          <ComposerAttach placement="beside" />
          <ComposerField>
            <ComposerHeader className={styles.header}>
              <ComposerUploadTray />
              {attachments.policyError && <UploadPolicyAlert onRetry={attachments.reloadPolicy} />}
              <ComposerIntent replyAuthor={replyAuthor} replyPreview={replyPreview} />
              <PrivateAssistantMode
                active={privateAssistant}
                mention={assistantMention}
                onLeave={() => rememberAssistant(false)}
              />
            </ComposerHeader>
            <ComposerAttach placement="field" />
            <MessageInput sendInTurn={sendInTurn}>{children}</MessageInput>
          </ComposerField>
          <SendButton privateAssistant={privateAssistant} />
        </ComposerVoice>
      </ComposerUploads>
    </Composer>
  );
}

function isPrivateIntent(intent: ConversationIntent): boolean {
  return intent?.kind === 'ask' || (intent?.kind === 'reply' && Boolean(intent.privateAssistant));
}

function showRejections(reasons: string[]) {
  reasons.forEach((reason) => void message.error(reason));
}

/** Without the limits no file can be picked, so the person can ask for them again. */
function UploadPolicyAlert({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert">
      Не вдалося завантажити ліміти файлів.{' '}
      <Button type="link" size="small" onClick={onRetry}>
        Повторити
      </Button>
    </div>
  );
}
