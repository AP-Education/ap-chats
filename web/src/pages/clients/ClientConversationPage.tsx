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
  PaperPlaneRightIcon,
  PhoneIcon,
} from '@phosphor-icons/react';
import { Button, Input, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

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
    margin-top: 4px;
    color: ${token.colorTextTertiary};
    font-size: 11px;
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
  return (
    <div
      className={cx(
        styles.bubble,
        message.direction === 'out' && styles.outgoing,
        message.direction === 'system' && styles.system,
      )}
    >
      {message.text}
      {message.direction !== 'system' && (
        <div className={styles.meta}>
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

  function send() {
    const text = draft.trim();
    if (!text) return;
    setMessages((current) => [
      ...current,
      { id: `local-${current.length}`, direction: 'out', text, at: 'щойно', by: 'Ви' },
    ]);
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
      <form
        className={styles.composer}
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={`Написати в ${conversation.channel}…`}
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
