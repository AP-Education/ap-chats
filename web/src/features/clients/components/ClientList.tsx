import { PanelHeader, PanelTitle, useIsMobile } from '@ap-education/ui';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { Input } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';
import { Link, useMatch } from 'react-router-dom';

import { Avatar } from '@/shared/ui/Avatar';

import {
  type ClientConversation,
  clientConversations,
  type FunnelCode,
  funnelNames,
  isAwaitingReply,
} from '../data';
import { ClientChannelIcon } from './ClientChannelIcon';

type Filter = 'all' | 'awaiting' | FunnelCode;

const filters: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'awaiting', label: 'awaiting reply' },
  { id: 'BB', label: 'Bachelor' },
  { id: 'MA', label: 'Masters & MBA' },
];

const useStyles = createStyles(({ token, css }) => ({
  root: css`
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
  `,
  search: css`
    padding: 0 8px 8px;
  `,
  filters: css`
    display: flex;
    gap: 6px;
    padding: 0 8px 10px;
    overflow-x: auto;
    scrollbar-width: none;
  `,
  filter: css`
    flex: none;
    padding: 4px 10px;
    border: 0;
    border-radius: ${token.borderRadius}px;
    background: ${token.colorFillTertiary};
    color: ${token.colorTextSecondary};
    font: inherit;
    font-size: 13px;
    cursor: pointer;
  `,
  filterOn: css`
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimaryText};
    font-weight: 600;
  `,
  list: css`
    min-height: 0;
    overflow-y: auto;
    padding-bottom: var(--shell-footer-space, 0px);
  `,
  row: css`
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 1px 8px;
    padding: 8px;
    border-radius: ${token.borderRadius}px;
    text-decoration: none;

    &,
    &:link,
    &:visited,
    &:hover {
      color: ${token.colorTextSecondary};
    }

    &:hover {
      background: ${token.colorFillTertiary};
    }

    &:focus-visible {
      outline: none;
      box-shadow: inset 0 0 0 2px ${token.colorPrimaryBorder};
    }
  `,
  active: css`
    background: ${token.colorPrimaryBg};

    &:hover {
      background: ${token.colorPrimaryBgHover};
    }
  `,
  avatar: css`
    position: relative;
    flex: none;
  `,
  channel: css`
    position: absolute;
    right: -3px;
    bottom: -3px;
    display: grid;
    place-items: center;
    width: 18px;
    height: 18px;
    border: 2px solid ${token.colorBgContainer};
    border-radius: 50%;
    background: ${token.colorPrimary};
    color: ${token.colorTextLightSolid};
  `,
  summary: css`
    display: grid;
    flex: 1;
    gap: 2px;
    min-width: 0;
  `,
  name: css`
    overflow: hidden;
    color: ${token.colorText};
    font-weight: 600;
    white-space: nowrap;
    text-overflow: ellipsis;
  `,
  preview: css`
    overflow: hidden;
    font-size: 13px;
    white-space: nowrap;
    text-overflow: ellipsis;
  `,
  meta: css`
    display: grid;
    flex: none;
    justify-items: end;
    gap: 4px;
    font-size: 12px;
  `,
  awaiting: css`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${token.colorPrimary};
  `,
  empty: css`
    padding: 24px 16px;
    color: ${token.colorTextTertiary};
    text-align: center;
  `,
}));

function matches(conversation: ClientConversation, filter: Filter, query: string): boolean {
  if (filter === 'awaiting' && !isAwaitingReply(conversation)) return false;
  if ((filter === 'BB' || filter === 'MA') && conversation.funnel !== filter) return false;
  const text = `${conversation.name} ${conversation.programme}`.toLowerCase();
  return text.includes(query.trim().toLowerCase());
}

function ClientRow({ conversation }: { conversation: ClientConversation }) {
  const { styles, cx } = useStyles();
  const isMobile = useIsMobile();
  // The panel renders outside the route tree, so the open conversation comes from the URL.
  const isActive = useMatch('/clients/:conversationId')?.params.conversationId === conversation.id;
  const last = conversation.messages.at(-1);

  return (
    <Link
      to={`/clients/${conversation.id}`}
      className={cx(styles.row, isActive && styles.active)}
      title={`${funnelNames[conversation.funnel]} · ${conversation.stage}`}
    >
      <span className={styles.avatar}>
        <Avatar path={null} alt={conversation.name} size={isMobile ? 44 : 36} shape="circle" />
        <span className={styles.channel}>
          <ClientChannelIcon channel={conversation.channel} size={10} />
        </span>
      </span>
      <span className={styles.summary}>
        <span className={styles.name}>{conversation.name}</span>
        <span className={styles.preview}>{last?.text}</span>
      </span>
      <span className={styles.meta}>
        <span>{last?.at}</span>
        {isAwaitingReply(conversation) && !isActive && (
          <span className={styles.awaiting} aria-label="awaiting reply" />
        )}
      </span>
    </Link>
  );
}

/** The clients' conversations from every channel, newest problems first, with quick filters. */
export function ClientList() {
  const { styles, cx } = useStyles();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const shown = clientConversations.filter((conversation) => matches(conversation, filter, query));

  return (
    <div className={styles.root}>
      <PanelHeader>
        <PanelTitle>Clients</PanelTitle>
      </PanelHeader>
      <div className={styles.search}>
        <Input
          prefix={<MagnifyingGlassIcon size={20} />}
          placeholder="Client or programme"
          aria-label="Find a client or programme"
          allowClear
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className={styles.filters} role="toolbar" aria-label="Filter clients">
        {filters.map(({ id, label }) => (
          <button
            key={id}
            className={cx(styles.filter, filter === id && styles.filterOn)}
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className={styles.list}>
        {shown.map((conversation) => (
          <ClientRow key={conversation.id} conversation={conversation} />
        ))}
        {!shown.length && <div className={styles.empty}>Nobody found</div>}
      </div>
    </div>
  );
}
