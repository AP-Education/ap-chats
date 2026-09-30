import { ChatCircleDotsIcon } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { Button, Empty, message as toast, Skeleton } from 'antd';
import { createStyles } from 'antd-style';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { Avatar } from '@/shared/ui/Avatar/Avatar';

import { searchPeople } from '../../api/direct-messages-api';
import { useOpenDirectMessage } from '../../hooks/useOpenDirectMessage';

const useStyles = createStyles(({ token, css }) => ({
  heading: css`
    padding: 12px 12px 4px;
    color: ${token.colorTextSecondary};
    font-size: 12px;
    font-weight: 600;
  `,
  row: css`
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 54px;
    padding: 8px 12px;
    border: 0;
    background: transparent;
    color: ${token.colorText};
    text-align: left;
    cursor: pointer;

    &:hover {
      background: ${token.colorFillTertiary};
    }

    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: -2px;
    }
  `,
  name: css`
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
  `,
  action: css`
    color: ${token.colorTextTertiary};
  `,
  error: css`
    padding: 12px;
  `,
}));

interface PeopleSearchResultsProps {
  workspaceId: string;
  query: string;
  excludedMemberIds: Set<string>;
  showEmpty: boolean;
  onNavigate?: () => void;
}

export function PeopleSearchResults({
  workspaceId,
  query,
  excludedMemberIds,
  showEmpty,
  onNavigate,
}: PeopleSearchResultsProps) {
  const { styles } = useStyles();
  const { token, identity } = useQueryAuth();
  const { open, opening } = useOpenDirectMessage(workspaceId);
  const searchTerm = useDebouncedValue(query.trim(), 180);

  const people = useQuery({
    queryKey: ['dm-people-search', identity, workspaceId, searchTerm],
    queryFn: () => searchPeople(token as string, workspaceId, searchTerm),
    enabled: Boolean(token && searchTerm),
  });

  const searching = searchTerm !== query.trim() || people.isPending;
  const visible = people.data?.filter((person) => !excludedMemberIds.has(person.memberId)) ?? [];

  async function choose(memberId: string) {
    try {
      await open(memberId);
      onNavigate?.();
    } catch {
      toast.error('Не вдалося відкрити розмову.');
    }
  }

  if (searching) {
    return (
      <div role="status" aria-label="Шукаємо людей">
        <div className={styles.heading}>Люди</div>
        {[0, 1].map((row) => (
          <div key={row} className={styles.row}>
            <Skeleton.Avatar active size={36} shape="circle" />
            <Skeleton.Input active size="small" style={{ width: 120 }} />
          </div>
        ))}
      </div>
    );
  }

  if (people.isError) {
    return (
      <div role="alert" className={styles.error}>
        Не вдалося знайти людей.{' '}
        <Button type="link" onClick={() => void people.refetch()}>
          Повторити
        </Button>
      </div>
    );
  }

  if (visible.length === 0) {
    if (!showEmpty) return null;
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Нічого не знайдено" />;
  }

  return (
    <section aria-label="Люди">
      <div className={styles.heading}>Люди</div>
      {visible.map((person) => (
        <button
          key={person.memberId}
          type="button"
          className={styles.row}
          disabled={opening}
          onClick={() => void choose(person.memberId)}
        >
          <Avatar
            path={person.avatarPath}
            alt={person.displayName ?? 'Колега'}
            size={36}
            shape="circle"
          />
          <span className={styles.name}>{person.displayName ?? 'Ім’я недоступне'}</span>
          <ChatCircleDotsIcon className={styles.action} size={18} aria-hidden="true" />
        </button>
      ))}
    </section>
  );
}
