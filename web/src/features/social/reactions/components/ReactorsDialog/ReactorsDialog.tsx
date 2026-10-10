import { useIsMobile } from '@ap-education/ui';
import { useQuery } from '@tanstack/react-query';
import { Button, Modal, Skeleton } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useConversationScope } from '@/features/social/conversation/store';
import type { MessageHistoryItem } from '@/features/social/messaging/types';
import { Avatar } from '@/shared/ui/Avatar';
import { BottomSheet } from '@/shared/ui/BottomSheet';

import { reactionCountLabel, totalReactions } from '../../actions';
import { listReactors } from '../../api/reactions-api';
import type { Reactor } from '../../types';

const useStyles = createStyles(({ token, css }) => ({
  title: css`
    margin: 0 0 12px;
    font-size: ${token.fontSizeLG}px;
    font-weight: 600;
  `,
  tabs: css`
    display: flex;
    gap: 6px;
    margin: 0 -4px 8px;
    padding: 0 4px 4px;
    overflow-x: auto;
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }
  `,
  tab: css`
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 12px;
    border: 0;
    border-radius: 16px;
    background: ${token.colorFillTertiary};
    color: ${token.colorText};
    font: inherit;
    font-size: 14px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    cursor: pointer;

    &[aria-selected='true'] {
      background: ${token.colorPrimaryBg};
      color: ${token.colorPrimaryTextActive};
    }
  `,
  // Opaque text colour: Chromium fades colour emoji by its alpha.
  tabEmoji: css`
    color: ${token.colorTextBase};
    font-size: 18px;
    line-height: 1;
  `,
  list: css`
    min-height: 152px;
    padding: 0;
    list-style: none;
    max-height: min(56dvh, 440px);
    margin: 0 -8px;
    overflow-y: auto;
  `,
  person: css`
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 52px;
    padding: 6px 8px;
    border-radius: ${token.borderRadiusLG}px;
  `,
  name: css`
    flex: 1;
    min-width: 0;
    overflow: hidden;
    font-size: 15px;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  emojis: css`
    flex-shrink: 0;
    color: ${token.colorTextBase};
    font-size: 20px;
    letter-spacing: 2px;
  `,
  note: css`
    padding: 8px;
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSizeSM}px;
  `,
}));

interface Person {
  memberId: string;
  name: string;
  avatarPath: string | null;
  emojis: string[];
}

interface ReactorsDialogProps {
  item: MessageHistoryItem;
  onClose: () => void;
}

/** Who reacted and with what: a dialog beside the conversation, a sheet on a phone. */
export function ReactorsDialog({ item, onClose }: ReactorsDialogProps) {
  const { styles } = useStyles();
  const isMobile = useIsMobile();
  const [emoji, setEmoji] = useState<string | null>(null);
  const reactions = item.reactions ?? [];
  const total = totalReactions(item);
  const expected = emoji ? (reactions.find((entry) => entry.emoji === emoji)?.count ?? 0) : total;

  const content = (
    <>
      <div className={styles.tabs} role="tablist" aria-label="Реакції">
        <button
          type="button"
          role="tab"
          className={styles.tab}
          aria-selected={emoji === null}
          onClick={() => setEmoji(null)}
        >
          Усі {total}
        </button>
        {reactions.map((reaction) => (
          <button
            key={reaction.emoji}
            type="button"
            role="tab"
            className={styles.tab}
            aria-selected={emoji === reaction.emoji}
            aria-label={`${reaction.emoji} ${reaction.count}`}
            onClick={() => setEmoji(reaction.emoji)}
          >
            <span className={styles.tabEmoji} aria-hidden="true">
              {reaction.emoji}
            </span>
            {reaction.count}
          </button>
        ))}
      </div>
      <ReactorList messageId={item.message.id} emoji={emoji} expected={expected} />
    </>
  );

  if (isMobile) {
    return (
      <BottomSheet open onClose={onClose} aria-label="Реакції">
        <h2 className={styles.title}>{reactionCountLabel(total)}</h2>
        {content}
      </BottomSheet>
    );
  }

  return (
    <Modal open onCancel={onClose} footer={null} width={400} title={reactionCountLabel(total)}>
      {content}
    </Modal>
  );
}

function ReactorList({
  messageId,
  emoji,
  expected,
}: {
  messageId: string;
  emoji: string | null;
  expected: number;
}) {
  const { styles } = useStyles();
  const { workspaceId, channelId } = useConversationScope();
  const { token, identity } = useQueryAuth();
  const reactors = useQuery({
    queryKey: ['reactions', identity, workspaceId, channelId, messageId, emoji, expected],
    queryFn: () =>
      listReactors(token as string, workspaceId, channelId, messageId, emoji ?? undefined),
    enabled: Boolean(token),
    staleTime: 30_000,
  });

  if (reactors.isError && !reactors.data) {
    return (
      <div className={styles.list}>
        <div className={styles.note}>Не вдалося завантажити список.</div>
        <Button type="link" onClick={() => void reactors.refetch()}>
          Повторити
        </Button>
      </div>
    );
  }

  if (!reactors.data) {
    return (
      <div className={styles.list} aria-busy="true">
        {[0, 1, 2].map((row) => (
          <div key={row} className={styles.person}>
            <Skeleton.Avatar active size={36} />
            <Skeleton.Input active size="small" />
          </div>
        ))}
      </div>
    );
  }

  const people = byPerson(reactors.data);
  const unlisted = expected - reactors.data.length;

  return (
    <ul className={styles.list}>
      {people.map((person) => (
        <li key={person.memberId} className={styles.person}>
          <Avatar path={person.avatarPath} alt={person.name} size={36} shape="circle" />
          <span className={styles.name}>{person.name}</span>
          <span className={styles.emojis} aria-label={person.emojis.join(' ')}>
            {person.emojis.join('')}
          </span>
        </li>
      ))}
      {unlisted > 0 && <li className={styles.note}>і ще {unlisted}</li>}
    </ul>
  );
}

/** One row per person, in the order of their latest reaction, with every emoji they used. */
function byPerson(reactors: Reactor[]): Person[] {
  const people = new Map<string, Person>();
  for (const reactor of reactors) {
    const person = people.get(reactor.memberId);
    if (person) person.emojis.push(reactor.emoji);
    else
      people.set(reactor.memberId, {
        memberId: reactor.memberId,
        name: reactor.displayName ?? 'Ім’я недоступне',
        avatarPath: reactor.avatarPath,
        emojis: [reactor.emoji],
      });
  }
  return [...people.values()];
}
