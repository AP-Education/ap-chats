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
import { type ReactNode, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useConversationExtensions } from '@/features/social/conversation-scope/extensions';
import { useConversation, useConversationScope } from '@/features/social/conversation-scope/store';
import { writeToken } from '@/features/social/mentions/mention-tokens';

import { useAttachments } from '../../attachments/useAttachments';
import { useLinkedGif } from '../../gifs/useLinkedGif';
import type { ComposedMessage } from '../../types';
import { ComposerIntent } from './ComposerIntent';
import { parseComposerDraft } from './composer-draft';
import type { ReplyPreview } from './composerIntents';
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
  const { identity } = useQueryAuth();
  const draftKey = `ap-chats:draft:${identity}:${workspaceId}:${channelId}`;
  const audienceKey = `${draftKey}:audience`;
  const intent = useConversation((state) => state.intent);
  const extensions = useConversationExtensions();
  const assistantMemberId = extensions.find((extension) => extension.privateAssistantMemberId)
    ?.privateAssistantMemberId;
  const assistantMention = assistantMemberId
    ? writeToken({ kind: 'member', id: assistantMemberId })
    : null;
  const [savedPrivateAssistant, setSavedPrivateAssistant] = useState(
    () =>
      localStorage.getItem(audienceKey) === 'private' ||
      parseComposerDraft(localStorage.getItem(draftKey)).assistant,
  );
  const privateIntent =
    intent?.kind === 'ask' || (intent?.kind === 'reply' && intent.privateAssistant);
  const privateAssistant = savedPrivateAssistant || Boolean(privateIntent);
  const rememberAssistant = useCallback(
    (enabled: boolean) => {
      if (enabled) localStorage.setItem(audienceKey, 'private');
      else localStorage.removeItem(audienceKey);
      setSavedPrivateAssistant(enabled);
    },
    [audienceKey],
  );

  useLayoutEffect(() => {
    if (privateIntent && !savedPrivateAssistant) rememberAssistant(true);
  }, [privateIntent, rememberAssistant, savedPrivateAssistant]);

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
        if (assistantMention && draft.markdown.includes(assistantMention)) rememberAssistant(true);
        linkedGif.prefetch(draft.markdown);
      }}
      onSend={send}
    >
      <ComposerUploads
        queue={attachments.queue}
        policy={attachments.policy}
        onReject={showRejections}
      >
        <ComposerDropZone />
        <ComposerAttach placement="beside" />
        <ComposerField>
          <ComposerHeader>
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
      </ComposerUploads>
    </Composer>
  );
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
