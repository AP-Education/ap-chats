import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, type InputRef, message } from 'antd';
import { type RefObject, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { openDirectMessage } from '@/features/social/direct-messages/api/direct-messages-api';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { AdaptiveModal } from '@/shared/ui/AdaptiveModal';

import { findConversations } from './api';
import styles from './Search.module.css';
import { searchResults } from './search-results';
import { SearchResults } from './SearchResults';
import type { SearchResult } from './types';
import { useSearchRefresh } from './useSearchRefresh';

export function SearchDialog({
  workspaceId,
  workspaceName,
  open,
  onClose,
  onNavigate,
}: {
  workspaceId: string;
  workspaceName: string;
  open: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}) {
  const { t } = useTranslation('search');
  const input = useRef<InputRef>(null);
  const { identity } = useQueryAuth();
  return (
    <AdaptiveModal
      title={t(($) => $.dialog.title)}
      description={t(($) => $.dialog.description, { workspace: workspaceName })}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      bodyHeight="min(480px, calc(100dvh - 240px))"
      afterOpenChange={(visible) => {
        if (visible) input.current?.focus();
      }}
    >
      {open && (
        <SearchContent
          key={`${workspaceId}:${identity}`}
          workspaceId={workspaceId}
          input={input}
          onNavigate={onNavigate}
        />
      )}
    </AdaptiveModal>
  );
}

function SearchContent({
  workspaceId,
  input,
  onNavigate,
}: {
  workspaceId: string;
  input: RefObject<InputRef | null>;
  onNavigate: (path: string) => void;
}) {
  const { t } = useTranslation('search');
  const { token, identity } = useQueryAuth();
  const nameUnavailable = t(($) => $.results.nameUnavailable);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const [opening, setOpening] = useState(false);
  const pending = useRef(false);
  const lifetime = useRef<AbortController | null>(null);
  const listId = useId();
  const term = query.trim();
  const debounced = useDebouncedValue(term, 200);
  useSearchRefresh(identity, workspaceId);

  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    return () => controller.abort();
  }, [identity, workspaceId]);

  const results = useQuery({
    queryKey: ['conversation-search', identity, workspaceId, debounced],
    queryFn: ({ signal }) => findConversations(token!, workspaceId, debounced, signal),
    enabled: Boolean(token && debounced),
    gcTime: 0,
    staleTime: 0,
    retry: false,
  });
  const loading = Boolean(term && (term !== debounced || results.isFetching || results.isPending));
  const items = useMemo(
    () =>
      !term || loading || results.isError || !results.data
        ? []
        : searchResults(results.data, nameUnavailable),
    [term, loading, results.isError, results.data, nameUnavailable],
  );
  const index = Math.min(selected, Math.max(items.length - 1, 0));

  useEffect(() => {
    document.getElementById(`${listId}-${index}`)?.scrollIntoView({ block: 'nearest' });
  }, [index, listId, items]);

  const choose = useCallback(
    async (item: SearchResult) => {
      if (pending.current || !token) return;
      if (item.kind !== 'person') {
        onNavigate(`/${item.kind === 'channel' ? 'channels' : 'direct'}/${item.id}`);
        return;
      }
      pending.current = true;
      setOpening(true);
      const signal = lifetime.current!.signal;
      try {
        const conversation = await openDirectMessage(token, workspaceId, item.id, signal);
        if (!signal.aborted) onNavigate(`/direct/${conversation.id}`);
      } catch {
        if (!signal.aborted) void message.error(t(($) => $.dialog.openFailed));
      } finally {
        pending.current = false;
        if (!signal.aborted) setOpening(false);
      }
    },
    [token, workspaceId, onNavigate, t],
  );

  return (
    <div className={styles.content}>
      <Input
        ref={input}
        autoFocus
        size="large"
        role="combobox"
        aria-autocomplete="list"
        aria-label={t(($) => $.dialog.inputLabel)}
        aria-expanded={items.length > 0}
        aria-controls={items.length ? listId : undefined}
        aria-activedescendant={items.length ? `${listId}-${index}` : undefined}
        prefix={<MagnifyingGlassIcon size={20} />}
        allowClear
        maxLength={80}
        placeholder={t(($) => $.dialog.placeholder)}
        value={query}
        disabled={opening}
        onChange={(event) => {
          setQuery(event.target.value);
          setSelected(0);
        }}
        onKeyDown={(event) => {
          if (!items.length || opening || event.nativeEvent.isComposing) return;
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setSelected(
              (current) =>
                (Math.min(current, items.length - 1) +
                  (event.key === 'ArrowDown' ? 1 : -1) +
                  items.length) %
                items.length,
            );
          } else if (event.key === 'Enter') {
            event.preventDefault();
            void choose(items[index]!);
          }
        }}
      />
      <div className={styles.results}>
        {!term && <p className={styles.hint}>{t(($) => $.dialog.hint)}</p>}
        {loading && (
          <p role="status" className={styles.hint}>
            {t(($) => $.dialog.searching)}
          </p>
        )}
        {term && !loading && results.isError && (
          <div role="alert" className={styles.hint}>
            {t(($) => $.dialog.failed)}{' '}
            <Button onClick={() => void results.refetch()}>{t(($) => $.dialog.retry)}</Button>
          </div>
        )}
        {term && !loading && !results.isError && !items.length && (
          <p role="status" className={styles.hint}>
            {t(($) => $.dialog.empty)}
          </p>
        )}
        {items.length > 0 && (
          <SearchResults
            items={items}
            selected={index}
            busy={opening}
            listId={listId}
            onChoose={choose}
          />
        )}
        {opening && (
          <p role="status" className={styles.hint}>
            {t(($) => $.dialog.opening)}
          </p>
        )}
      </div>
    </div>
  );
}
