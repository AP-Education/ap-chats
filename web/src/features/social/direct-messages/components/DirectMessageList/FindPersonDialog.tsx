import { ContentState, ContentStateDescription, ContentStateIcon } from '@ap-education/ui';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, message as toast, Modal, Skeleton } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import type { MemberSummary } from '@/features/workspaces/types';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { Avatar } from '@/shared/ui/Avatar';

import { searchPeople } from '../../api/direct-messages-api';
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
  error: css`
    padding: 9px;
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
  const { t } = useTranslation(['directMessages', 'common']);
  const { token, identity } = useQueryAuth();
  const { open: openConversation, opening } = useOpenDirectMessage(workspaceId);
  const [query, setQuery] = useState('');
  const searchTerm = useDebouncedValue(query.trim(), 180);

  const people = useQuery({
    queryKey: ['find-person-search', identity, workspaceId, searchTerm],
    queryFn: () => searchPeople(token as string, workspaceId, searchTerm),
    enabled: Boolean(open && token && searchTerm),
  });

  const hasQuery = Boolean(query.trim());
  const searching = hasQuery && (searchTerm !== query.trim() || people.isPending);
  const results = people.data ?? [];
  const showEmpty = hasQuery && !searching && !people.isError && results.length === 0;

  async function choose(person: MemberSummary) {
    try {
      await openConversation(person.memberId);
      onClose();
      setQuery('');
      onNavigate?.();
    } catch {
      toast.error(t(($) => $.page.openFailedToast));
    }
  }

  return (
    <Modal
      title={t(($) => $.findPerson.title)}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      <Input
        autoFocus
        placeholder={t(($) => $.findPerson.placeholder)}
        aria-label={t(($) => $.findPerson.placeholder)}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className={styles.people}>
        {!hasQuery && (
          <ContentState compact>
            <ContentStateIcon>
              <MagnifyingGlassIcon />
            </ContentStateIcon>
            <ContentStateDescription>{t(($) => $.findPerson.startTyping)}</ContentStateDescription>
          </ContentState>
        )}
        {hasQuery &&
          searching &&
          [0, 1, 2].map((row) => (
            <div key={row} className={styles.person}>
              <Skeleton.Avatar active size={32} shape="circle" />
              <Skeleton.Input active size="small" style={{ width: 140 }} />
            </div>
          ))}
        {hasQuery && !searching && people.isError && (
          <div role="alert" className={styles.error}>
            {t(($) => $.people.searchFailed)}{' '}
            <Button type="link" onClick={() => void people.refetch()}>
              {t(($) => $.common.actions.retry)}
            </Button>
          </div>
        )}
        {showEmpty && (
          <ContentState compact>
            <ContentStateIcon>
              <MagnifyingGlassIcon />
            </ContentStateIcon>
            <ContentStateDescription>{t(($) => $.findPerson.nobodyFound)}</ContentStateDescription>
          </ContentState>
        )}
        {hasQuery &&
          !searching &&
          !people.isError &&
          results.map((person) => (
            <button
              key={person.memberId}
              type="button"
              className={styles.person}
              disabled={opening}
              onClick={() => void choose(person)}
            >
              <Avatar
                path={person.avatarPath}
                alt={person.displayName ?? t(($) => $.colleague)}
                size={32}
                shape="circle"
              />
              <span>{person.displayName ?? t(($) => $.nameUnavailable)}</span>
            </button>
          ))}
      </div>
    </Modal>
  );
}
