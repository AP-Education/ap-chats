import { Empty, Input, message as toast, Modal, Skeleton } from 'antd';
import { createStyles } from 'antd-style';
import { useEffect, useState } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { Avatar } from '@/shared/ui/Avatar/Avatar';

import { type PersonResult, searchPeople } from '../../api/direct-messages-api';
import { useOpenDirectMessage } from '../../hooks/useOpenDirectMessage';

const useStyles = createStyles(({ token, css }) => ({
  people: css`
    min-height: 100px;
    max-height: 320px;
    overflow-y: auto;
    padding-top: 8px;
  `,
  person: css`
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 9px;
    border: 0;
    border-radius: ${token.borderRadius}px;
    background: transparent;
    color: ${token.colorText};
    text-align: left;
    cursor: pointer;

    &:hover {
      background: ${token.colorFillTertiary};
    }
  `,
}));

interface FindPersonDialogProps {
  workspaceId: string;
  open: boolean;
  onClose: () => void;
  onNavigate?: () => void;
}

export function FindPersonDialog({
  workspaceId,
  open,
  onClose,
  onNavigate,
}: FindPersonDialogProps) {
  const { styles } = useStyles();
  const { token } = useQueryAuth();
  const { open: openConversation, opening } = useOpenDirectMessage(workspaceId);
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<PersonResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!open || !query.trim() || !token) return;
    let active = true;
    const timer = setTimeout(() => {
      setSearching(true);
      void searchPeople(token, workspaceId, query.trim())
        .then((items) => {
          if (active) setPeople(items);
        })
        .catch(() => {
          if (active) toast.error('Не вдалося знайти людей.');
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 180);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, query, token, workspaceId]);

  async function choose(person: PersonResult) {
    try {
      await openConversation(person.memberId);
      onClose();
      setQuery('');
      setPeople([]);
      onNavigate?.();
    } catch {
      toast.error('Не вдалося відкрити розмову.');
    }
  }

  const hasQuery = Boolean(query.trim());
  const showEmpty = hasQuery && !searching && people.length === 0;

  return (
    <Modal title="Написати колезі" open={open} onCancel={onClose} footer={null} destroyOnHidden>
      <Input
        autoFocus
        placeholder="Ім’я колеги"
        aria-label="Ім’я колеги"
        value={query}
        onChange={(event) => {
          setPeople([]);
          setSearching(Boolean(event.target.value.trim()));
          setQuery(event.target.value);
        }}
      />
      <div className={styles.people}>
        {!hasQuery && (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Почніть вводити ім’я" />
        )}
        {hasQuery &&
          searching &&
          [0, 1, 2].map((row) => (
            <div key={row} className={styles.person}>
              <Skeleton.Avatar active size={32} shape="circle" />
              <Skeleton.Input active size="small" style={{ width: 140 }} />
            </div>
          ))}
        {showEmpty && (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Нікого не знайдено" />
        )}
        {hasQuery &&
          !searching &&
          people.map((person) => (
            <button
              key={person.memberId}
              type="button"
              className={styles.person}
              disabled={opening}
              onClick={() => void choose(person)}
            >
              <Avatar
                path={person.avatarPath}
                alt={person.displayName ?? 'Колега'}
                size={32}
                shape="circle"
              />
              <span>{person.displayName ?? 'Ім’я недоступне'}</span>
            </button>
          ))}
      </div>
    </Modal>
  );
}
