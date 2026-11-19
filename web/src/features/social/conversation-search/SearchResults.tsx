import { ChatTextIcon, HashIcon, UserPlusIcon } from '@phosphor-icons/react';
import type { TFunction } from 'i18next';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/shared/ui/Avatar';

import styles from './Search.module.css';
import type { SearchResult } from './types';

const GROUPS = ['channel', 'conversation', 'person'] as const;

export function SearchResults({
  items,
  selected,
  busy,
  onChoose,
  listId,
}: {
  items: SearchResult[];
  selected: number;
  busy: boolean;
  onChoose: (item: SearchResult) => void;
  listId: string;
}) {
  const { t } = useTranslation('search');
  return (
    <div id={listId} role="listbox" aria-label={t(($) => $.results.label)} aria-busy={busy}>
      {GROUPS.map((kind) => {
        const label = t(($) => $.groups[kind]);
        const group = items.filter((item) => item.kind === kind);
        if (!group.length) return null;
        return (
          <div key={kind} role="group" aria-label={label}>
            <h3 className={styles.heading} aria-hidden="true">
              {label}
            </h3>
            {group.map((item) => {
              const index = items.indexOf(item);
              return (
                <ResultRow
                  key={item.key}
                  id={`${listId}-${index}`}
                  item={item}
                  selected={selected === index}
                  busy={busy}
                  onChoose={onChoose}
                />
              );
            })}
            {group.length === 20 && <p className={styles.hint}>{t(($) => $.results.limit)}</p>}
          </div>
        );
      })}
    </div>
  );
}

const ResultRow = memo(function ResultRow({
  item,
  id,
  selected,
  busy,
  onChoose,
}: {
  item: SearchResult;
  id: string;
  selected: boolean;
  busy: boolean;
  onChoose: (item: SearchResult) => void;
}) {
  const { t } = useTranslation('search');
  const { kind } = item;
  const description = descriptionOf(item, t);
  return (
    <button
      id={id}
      type="button"
      role="option"
      aria-label={`${item.name}. ${description}`}
      aria-selected={selected}
      className={styles.result}
      disabled={busy}
      tabIndex={-1}
      onClick={() => onChoose(item)}
    >
      {kind === 'channel' ? (
        <span className={styles.channelIcon}>
          <HashIcon size={24} />
        </span>
      ) : (
        <span aria-hidden="true">
          <Avatar path={item.avatarPath} alt={item.name} size={40} shape="circle" />
        </span>
      )}
      <span className={styles.label}>
        <span className={styles.name}>{item.name}</span>
        <span className={styles.description}>{description}</span>
      </span>
      {kind === 'person' ? (
        <UserPlusIcon size={19} aria-hidden="true" />
      ) : (
        <ChatTextIcon size={19} aria-hidden="true" />
      )}
    </button>
  );
});

function descriptionOf(item: SearchResult, t: TFunction<'search'>) {
  if (item.kind === 'channel') return t(($) => $.descriptions.channel);
  if (item.kind === 'person') return t(($) => $.descriptions.person);
  if (item.active === false) return t(($) => $.descriptions.leftCompany);
  return t(($) => $.descriptions.conversation);
}
