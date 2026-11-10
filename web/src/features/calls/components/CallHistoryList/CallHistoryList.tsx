import {
  ContentState,
  ContentStateDescription,
  ContentStateIcon,
  PanelHeader,
  PanelTitle,
} from '@ap-education/ui';
import { PhoneIcon } from '@phosphor-icons/react';
import { Button, Segmented } from 'antd';
import { createStyles } from 'antd-style';
import { type RefObject, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { matchPath, useLocation } from 'react-router-dom';

import { PanelHeaderActions } from '@/shared/ui/PanelHeaderActions';

import { useCallHistory } from '../../hooks/useCallHistory';
import type { CallHistoryFilter } from '../../types';
import { CallHistoryListSkeleton } from './CallHistoryListSkeleton';
import { type CallEntryLinkState, CallHistoryRow } from './CallHistoryRow';
import { groupCallHistory } from './groupCallHistory';

const useStyles = createStyles(({ css }) => ({
  root: css`
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
  `,
  list: css`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  `,
  error: css`
    padding: 12px;
  `,
  empty: css`
    padding: 24px 12px;
  `,
  sentinel: css`
    height: 1px;
  `,
}));

export function CallHistoryList({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation('calls');
  const { styles } = useStyles();
  const [filter, setFilter] = useState<CallHistoryFilter>('all');
  const listRef = useRef<HTMLDivElement>(null);

  return (
    <div className={styles.root}>
      <PanelHeader>
        <PanelTitle>{t(($) => $.title)}</PanelTitle>
        <PanelHeaderActions>
          <Segmented
            size="small"
            value={filter}
            onChange={(value) => setFilter(value as CallHistoryFilter)}
            options={[
              { label: t(($) => $.filters.all), value: 'all' },
              { label: t(($) => $.filters.missed), value: 'missed' },
            ]}
          />
        </PanelHeaderActions>
      </PanelHeader>
      <div ref={listRef} className={styles.list}>
        <CallHistoryResults filter={filter} scrollRoot={listRef} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

function CallHistoryResults({
  filter,
  scrollRoot,
  onNavigate,
}: {
  filter: CallHistoryFilter;
  scrollRoot: RefObject<HTMLDivElement | null>;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation(['calls', 'common']);
  const { styles } = useStyles();
  const location = useLocation();
  const history = useCallHistory(filter);

  if (history.isPending) return <CallHistoryListSkeleton />;
  if (history.isError && !history.data)
    return (
      <div role="alert" className={styles.error}>
        {t(($) => $.loadFailed)}{' '}
        <Button type="link" onClick={() => void history.refetch()}>
          {t(($) => $.common.actions.retry)}
        </Button>
      </div>
    );

  const entries = groupCallHistory(history.data.pages.flatMap((page) => page.items));

  if (entries.length === 0)
    return (
      <div className={styles.empty}>
        <ContentState compact>
          <ContentStateIcon>
            <PhoneIcon />
          </ContentStateIcon>
          <ContentStateDescription>
            {filter === 'missed' ? t(($) => $.empty.missed) : t(($) => $.empty.all)}
          </ContentStateDescription>
        </ContentState>
      </div>
    );

  const openChannelId = matchPath('/calls/:channelId', location.pathname)?.params.channelId;
  const openEntries = entries.filter((entry) => entry.latest.channelId === openChannelId);
  const clickedKey = (location.state as CallEntryLinkState | null)?.callEntry;
  const activeKey = (openEntries.find((entry) => entry.key === clickedKey) ?? openEntries[0])?.key;

  return (
    <>
      {entries.map((entry) => (
        <CallHistoryRow
          key={entry.key}
          entry={entry}
          active={entry.key === activeKey}
          onNavigate={onNavigate}
        />
      ))}
      {history.hasNextPage && (
        <NextPageLoader
          scrollRoot={scrollRoot}
          loading={history.isFetchingNextPage}
          failed={history.isFetchNextPageError}
          onLoad={() => void history.fetchNextPage({ cancelRefetch: false })}
        />
      )}
    </>
  );
}

function NextPageLoader({
  scrollRoot,
  loading,
  failed,
  onLoad,
}: {
  scrollRoot: RefObject<HTMLDivElement | null>;
  loading: boolean;
  failed: boolean;
  onLoad: () => void;
}) {
  const { t } = useTranslation(['calls', 'common']);
  const { styles } = useStyles();
  const sentinelRef = useRef<HTMLDivElement>(null);
  // A failed page waits for an explicit retry instead of refiring every time it scrolls into view.
  const paused = loading || failed;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || paused) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) onLoad();
      },
      { root: scrollRoot.current, rootMargin: '0px 0px 320px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [scrollRoot, paused, onLoad]);

  if (loading) return <CallHistoryListSkeleton rows={2} />;
  if (failed)
    return (
      <div role="alert" className={styles.error}>
        {t(($) => $.loadFailed)}{' '}
        <Button type="link" onClick={onLoad}>
          {t(($) => $.common.actions.retry)}
        </Button>
      </div>
    );

  return <div ref={sentinelRef} className={styles.sentinel} />;
}
