import { useCurrentUser } from '@ap-education/shell-sdk';
import {
  ContentState,
  ContentStateIcon,
  ContentStateTitle,
  Page,
  PageActions,
  PageAside,
  PageAsideTrigger,
  PageBody,
  PageHeader,
  PageTitle,
  useIsMobile,
} from '@ap-education/ui';
import {
  BriefcaseIcon,
  IdentificationCardIcon,
  LockSimpleIcon,
  PaperPlaneRightIcon,
  PhoneIcon,
} from '@phosphor-icons/react';
import { Button, Input, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

import { askStarMe } from '@/features/clients/api/ask-star-me';
import {
  answerAbout,
  ASSISTANT_MENTION,
  assistantPrompts,
  assistantTurns,
  isForAssistant,
  questionOf,
} from '@/features/clients/assistant';
import { ClientCard } from '@/features/clients/components/ClientCard';
import { ClientChannelIcon } from '@/features/clients/components/ClientChannelIcon';
import {
  type ClientConversation,
  type ClientMessage,
  findClientConversation,
  funnelNames,
} from '@/features/clients/data';
import { MobileMenuButton } from '@/layouts/chats/MobileMenuButton';
import { Avatar } from '@/shared/ui/Avatar';

const useStyles = createStyles(({ token, css }) => ({
  title: css`
    display: grid;
    gap: 1px;
    min-width: 0;
  `,
  name: css`
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  `,
  sub: css`
    display: flex;
    align-items: center;
    gap: 6px;
    color: ${token.colorTextTertiary};
    font-size: 12px;
    font-weight: 400;
  `,
  conversation: css`
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  `,
  deals: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border-bottom: 1px solid ${token.colorBorderSecondary};
  `,
  deal: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: ${token.borderRadius}px;
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimaryText};
    font-size: 13px;
    font-weight: 600;
  `,
  history: css`
    padding: 4px 10px;
    border-radius: ${token.borderRadius}px;
    background: ${token.colorFillTertiary};
    color: ${token.colorTextSecondary};
    font-size: 13px;
  `,
  messages: css`
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 10px;
    min-height: 0;
    padding: 16px;
    overflow-y: auto;
  `,
  bubble: css`
    max-width: min(560px, 80%);
    padding: 10px 14px;
    border-radius: 14px;
    background: ${token.colorBgContainer};
    box-shadow: 0 1px 2px rgb(0 0 0 / 0.06);
    color: ${token.colorText};
    white-space: pre-wrap;
  `,
  outgoing: css`
    align-self: flex-end;
    background: ${token.colorPrimaryBg};
  `,
  system: css`
    align-self: center;
    max-width: 90%;
    padding: 6px 12px;
    border-radius: 999px;
    background: ${token.colorFillTertiary};
    box-shadow: none;
    color: ${token.colorTextSecondary};
    font-size: 12px;
    text-align: center;
  `,
  meta: css`
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 4px;
    color: ${token.colorTextTertiary};
    font-size: 11px;
  `,
  note: css`
    align-self: flex-end;
    border: 1px dashed ${token.colorBorder};
    background: ${token.colorFillQuaternary};
    box-shadow: none;
  `,
  assistant: css`
    display: flex;
    gap: 10px;
    align-self: flex-start;
    max-width: min(620px, 86%);
  `,
  assistantBubble: css`
    border: 1px solid ${token.colorPrimaryBorder};
    background: ${token.colorPrimaryBg};
  `,
  assistantName: css`
    margin-bottom: 2px;
    color: ${token.colorPrimaryText};
    font-size: 12px;
    font-weight: 600;
  `,
  sources: css`
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 6px;

    span {
      padding: 1px 6px;
      border-radius: 4px;
      background: ${token.colorBgContainer};
      color: ${token.colorTextSecondary};
      font-size: 11px;
    }
  `,
  prompts: css`
    display: flex;
    gap: 6px;
    padding: 8px 16px 0;
    overflow-x: auto;
    scrollbar-width: none;

    button {
      flex: none;
      padding: 3px 10px;
      border: 1px solid ${token.colorPrimaryBorder};
      border-radius: 999px;
      background: ${token.colorBgContainer};
      color: ${token.colorPrimaryText};
      font: inherit;
      font-size: 12px;
      cursor: pointer;
    }
  `,
  composer: css`
    display: flex;
    gap: 8px;
    padding: 12px 16px calc(12px + var(--app-inset-bottom, 0px));
    border-top: 1px solid ${token.colorBorderSecondary};
  `,
}));

function MessageBubble({ message }: { message: ClientMessage }) {
  const { styles, cx } = useStyles();

  if (message.direction === 'assistant') {
    return (
      <div className={styles.assistant}>
        <Avatar path="builtin:ai-spark" alt="StarMe" size={32} shape="circle" />
        <div className={cx(styles.bubble, styles.assistantBubble)}>
          <div className={styles.assistantName}>
            StarMe{message.offline && ` · offline (${message.offline}), from the client events`}
          </div>
          {message.pending ? 'Thinking…' : message.text}
          {!!message.sources?.length && (
            <div className={styles.sources} aria-label="From the events">
              {message.sources.map((source) => (
                <span key={source}>{source}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cx(
        styles.bubble,
        message.direction === 'out' && styles.outgoing,
        message.direction === 'system' && styles.system,
        message.direction === 'note' && styles.note,
      )}
    >
      {message.text}
      {message.direction !== 'system' && (
        <div className={styles.meta}>
          {message.direction === 'note' && (
            <>
              <LockSimpleIcon size={11} /> team only ·{' '}
            </>
          )}
          {message.by ? `${message.by} · ` : ''}
          {message.at}
        </div>
      )}
    </div>
  );
}

function Conversation({ conversation }: { conversation: ClientConversation }) {
  const { styles } = useStyles();
  const user = useCurrentUser();
  const [messages, setMessages] = useState(conversation.messages);
  const [draft, setDraft] = useState('');

  function settle(id: string, answer: Partial<ClientMessage>) {
    setMessages((current) =>
      current.map((message) =>
        message.id === id ? { ...message, ...answer, pending: false } : message,
      ),
    );
  }

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const id = `local-${Date.now()}`;
    setDraft('');

    if (!isForAssistant(trimmed)) {
      setMessages((current) => [
        ...current,
        { id, direction: 'out', text: trimmed, at: 'just now', by: 'You' },
      ]);
      return;
    }

    // The question stays with the team; StarMe reads the client card and the whole conversation.
    const question = questionOf(trimmed);
    const answerId = `${id}-answer`;
    const asker = (user.status === 'signed-in' && user.profile?.name) || 'Team member';
    const turns = assistantTurns(conversation, messages, question, asker);
    setMessages((current) => [
      ...current,
      { id, direction: 'note', text: trimmed, at: 'just now', by: 'You' },
      { id: answerId, direction: 'assistant', text: '', at: 'just now', pending: true },
    ]);

    const offline = (reason: unknown) => {
      const answer = answerAbout(conversation, question);
      const why = reason instanceof Error ? reason.message : 'not signed in';
      settle(answerId, { text: answer.text, sources: answer.sources, offline: why });
    };
    if (user.status !== 'signed-in') return offline(null);
    askStarMe(turns, user.accessToken).then(
      (text) => settle(answerId, { text, sources: ['client card', 'conversation'] }),
      offline,
    );
  }

  return (
    <div className={styles.conversation}>
      <div className={styles.deals}>
        <span className={styles.deal}>
          <BriefcaseIcon size={14} />
          {funnelNames[conversation.funnel]} · {conversation.funnel}
        </span>
        <span className={styles.history}>Full history</span>
      </div>
      <div
        className={styles.messages}
        role="log"
        aria-label={`Conversation with ${conversation.name}`}
      >
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>
      <div className={styles.prompts} aria-label="Ask StarMe">
        {assistantPrompts.map((prompt) => (
          <button key={prompt} onClick={() => send(`${ASSISTANT_MENTION} ${prompt}`)}>
            ✦ {prompt}
          </button>
        ))}
      </div>
      <form
        className={styles.composer}
        onSubmit={(event) => {
          event.preventDefault();
          send(draft);
        }}
      >
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={`Write on ${conversation.channel}… · ${ASSISTANT_MENTION} for the assistant`}
          aria-label={`Message to ${conversation.name}`}
        />
        <Button
          type="primary"
          htmlType="submit"
          icon={<PaperPlaneRightIcon size={18} weight="fill" />}
          aria-label="Send"
        />
      </form>
    </div>
  );
}

function NoClientSelected() {
  const isMobile = useIsMobile();
  return (
    <Page>
      {isMobile && (
        <PageHeader>
          <MobileMenuButton />
          <PageTitle>Clients</PageTitle>
        </PageHeader>
      )}
      <PageBody>
        <ContentState>
          <ContentStateIcon>
            <IdentificationCardIcon />
          </ContentStateIcon>
          <ContentStateTitle>Pick a client to open the conversation</ContentStateTitle>
        </ContentState>
      </PageBody>
    </Page>
  );
}

/** A client's conversation from whatever channel they wrote, with their card beside it. */
export default function ClientConversationPage() {
  const { styles } = useStyles();
  const { conversationId } = useParams<{ conversationId: string }>();
  const conversation = findClientConversation(conversationId);

  if (!conversation) return <NoClientSelected />;

  return (
    <Page key={conversation.id}>
      <PageHeader>
        <MobileMenuButton />
        <PageTitle>
          <Avatar path={null} alt={conversation.name} size={40} shape="circle" />
          <span className={styles.title}>
            <span className={styles.name}>{conversation.name}</span>
            <span className={styles.sub}>
              <ClientChannelIcon channel={conversation.channel} size={12} />
              {conversation.channel} · owner: {conversation.owner}
            </span>
          </span>
        </PageTitle>
        <PageActions>
          <Tooltip title="Calls from the CRM are connected separately">
            <Button icon={<PhoneIcon size={18} />}>Call</Button>
          </Tooltip>
          <PageAsideTrigger aria-label="Client card">
            <IdentificationCardIcon size={20} />
          </PageAsideTrigger>
        </PageActions>
      </PageHeader>
      <PageBody>
        <Conversation conversation={conversation} />
      </PageBody>
      <PageAside>
        <ClientCard conversation={conversation} />
      </PageAside>
    </Page>
  );
}
