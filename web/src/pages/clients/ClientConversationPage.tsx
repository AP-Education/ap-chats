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

import {
  answerAbout,
  ASSISTANT_MENTION,
  assistantPrompts,
  isForAssistant,
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
          <div className={styles.assistantName}>StarMe</div>
          {message.text}
          {!!message.sources?.length && (
            <div className={styles.sources} aria-label="З подій">
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
              <LockSimpleIcon size={11} /> лише команда ·{' '}
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
  const [messages, setMessages] = useState(conversation.messages);
  const [draft, setDraft] = useState('');

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((current) => {
      const id = `local-${current.length}`;
      if (!isForAssistant(trimmed)) {
        return [...current, { id, direction: 'out', text: trimmed, at: 'щойно', by: 'Ви' }];
      }
      // The question stays with the team; the answer comes from the client's own events.
      const answer = answerAbout(conversation, trimmed.slice(ASSISTANT_MENTION.length));
      return [
        ...current,
        { id, direction: 'note', text: trimmed, at: 'щойно', by: 'Ви' },
        {
          id: `${id}-answer`,
          direction: 'assistant',
          text: answer.text,
          at: 'щойно',
          sources: answer.sources,
        },
      ];
    });
    setDraft('');
  }

  return (
    <div className={styles.conversation}>
      <div className={styles.deals}>
        <span className={styles.deal}>
          <BriefcaseIcon size={14} />
          {funnelNames[conversation.funnel]} · {conversation.funnel}
        </span>
        <span className={styles.history}>Вся історія</span>
      </div>
      <div className={styles.messages} role="log" aria-label={`Переписка з ${conversation.name}`}>
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>
      <div className={styles.prompts} aria-label="Запитати StarMe">
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
          placeholder={`Написати в ${conversation.channel}… · ${ASSISTANT_MENTION} — помічник`}
          aria-label={`Повідомлення для ${conversation.name}`}
        />
        <Button
          type="primary"
          htmlType="submit"
          icon={<PaperPlaneRightIcon size={18} weight="fill" />}
          aria-label="Надіслати"
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
          <PageTitle>Клієнти</PageTitle>
        </PageHeader>
      )}
      <PageBody>
        <ContentState>
          <ContentStateIcon>
            <IdentificationCardIcon />
          </ContentStateIcon>
          <ContentStateTitle>Оберіть клієнта, щоб відкрити переписку</ContentStateTitle>
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
              {conversation.channel} · власник: {conversation.owner}
            </span>
          </span>
        </PageTitle>
        <PageActions>
          <Tooltip title="Дзвінки з CRM підключаються окремо">
            <Button icon={<PhoneIcon size={18} />}>Подзвонити</Button>
          </Tooltip>
          <PageAsideTrigger aria-label="Картка клієнта">
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
