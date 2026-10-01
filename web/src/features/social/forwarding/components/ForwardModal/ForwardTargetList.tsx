import { CheckIcon } from '@phosphor-icons/react';
import { Button, Empty, Skeleton } from 'antd';
import { createStyles } from 'antd-style';

import {
  PrivateChannelIcon,
  PublicChannelIcon,
} from '@/features/communities/channels/channelIcons';
import { Avatar } from '@/shared/ui/Avatar/Avatar';

import type { ForwardTarget, ForwardTargetGroup, ForwardTargetOption } from './forward-targets';

const useStyles = createStyles(({ token, css }) => ({
  list: css`
    height: min(46vh, 400px);
    min-height: 220px;
    overflow-y: auto;
    border-top: 1px solid ${token.colorBorderSecondary};
    border-bottom: 1px solid ${token.colorBorderSecondary};
  `,
  heading: css`
    padding: 12px 8px 4px;
    color: ${token.colorTextTertiary};
    font-size: 12px;
    font-weight: 600;
  `,
  row: css`
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 64px;
    padding: 8px;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: ${token.colorText};
    text-align: left;
    cursor: pointer;

    &:hover:not(:disabled) {
      background: ${token.colorFillTertiary};
    }
    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: -2px;
    }
    &:disabled {
      color: ${token.colorTextQuaternary};
      cursor: not-allowed;
    }
  `,
  selected: css`
    background: ${token.colorPrimaryBg};
    &:hover:not(:disabled) {
      background: ${token.colorPrimaryBgHover};
    }
  `,
  icon: css`
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    flex: 0 0 40px;
    border-radius: 50%;
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimary};
  `,
  body: css`
    flex: 1;
    min-width: 0;
  `,
  name: css`
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
  `,
  detail: css`
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: ${token.colorTextTertiary};
    font-size: 13px;
  `,
  check: css`
    flex: 0 0 auto;
    color: ${token.colorPrimary};
  `,
  state: css`
    display: grid;
    place-content: center;
    min-height: 160px;
    padding: 16px;
    text-align: center;
  `,
  more: css`
    margin: 8px 0;
  `,
}));

function TargetRow({
  target,
  selected,
  onSelect,
}: {
  target: ForwardTargetOption;
  selected: boolean;
  onSelect: (target: ForwardTarget) => void;
}) {
  const { styles, cx } = useStyles();
  return (
    <button
      type="button"
      className={cx(styles.row, selected && styles.selected)}
      aria-pressed={selected}
      disabled={target.disabled}
      onClick={() => onSelect({ kind: target.kind, id: target.id, name: target.name })}
    >
      {target.kind === 'channel' ? (
        <span className={styles.icon} aria-hidden="true">
          {target.private ? <PrivateChannelIcon size={20} /> : <PublicChannelIcon size={20} />}
        </span>
      ) : (
        <Avatar path={target.avatarPath ?? null} alt={target.name} size={40} shape="circle" />
      )}
      <span className={styles.body}>
        <span className={styles.name}>{target.name}</span>
        <span className={styles.detail}>{target.detail}</span>
      </span>
      {selected && (
        <CheckIcon size={20} weight="bold" className={styles.check} aria-hidden="true" />
      )}
    </button>
  );
}

interface ForwardTargetListProps {
  groups: ForwardTargetGroup[];
  selected: ForwardTarget | null;
  onSelect: (target: ForwardTarget) => void;
  isLoading: boolean;
  isSearching: boolean;
  hasError: boolean;
  retry: () => void;
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => void;
  searched: boolean;
}

export function ForwardTargetList({
  groups,
  selected,
  onSelect,
  isLoading,
  isSearching,
  hasError,
  retry,
  hasMore,
  loadingMore,
  loadMore,
  searched,
}: ForwardTargetListProps) {
  const { styles } = useStyles();
  if (isLoading) {
    return (
      <div className={styles.list} role="status" aria-label="Завантажуємо розмови">
        <div className={styles.state}>
          <Skeleton active avatar paragraph={{ rows: 2 }} title={false} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.list} aria-label="Адресати пересилання">
      {groups.map((group) => (
        <section key={group.label} aria-label={group.label}>
          <div className={styles.heading}>{group.label}</div>
          {group.items.map((target) => (
            <TargetRow
              key={`${target.kind}:${target.id}`}
              target={target}
              selected={selected?.kind === target.kind && selected.id === target.id}
              onSelect={onSelect}
            />
          ))}
        </section>
      ))}
      {isSearching && (
        <div className={styles.state} role="status">
          Шукаємо колег…
        </div>
      )}
      {!isSearching && !groups.length && !hasError && (
        <div className={styles.state}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={searched ? 'Нікого не знайдено' : 'Немає доступних розмов'}
          />
        </div>
      )}
      {hasError && (
        <div className={styles.state} role="alert">
          <span>Не все вдалося завантажити.</span>
          <Button type="link" onClick={retry}>
            Повторити
          </Button>
        </div>
      )}
      {hasMore && (
        <Button block type="text" className={styles.more} loading={loadingMore} onClick={loadMore}>
          Показати ще розмови
        </Button>
      )}
    </div>
  );
}
