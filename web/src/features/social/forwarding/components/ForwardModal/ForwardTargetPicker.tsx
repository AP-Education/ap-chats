import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { Input, Segmented } from 'antd';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';

import type { ForwardTarget } from './forward-targets';
import { ForwardTargetList } from './ForwardTargetList';
import { useForwardTargets } from './useForwardTargets';

const useStyles = createStyles(({ css }) => ({
  search: css`
    margin-bottom: 12px;
  `,
  tabs: css`
    display: flex;
    margin-bottom: 8px;
  `,
}));

export function ForwardTargetPicker({
  workspaceId,
  selected,
  onSelect,
}: {
  workspaceId: string;
  selected: ForwardTarget | null;
  onSelect: (target: ForwardTarget) => void;
}) {
  const { styles } = useStyles();
  const { t } = useTranslation('forwarding');
  const targets = useForwardTargets(workspaceId);

  return (
    <>
      <Input
        autoFocus
        allowClear
        size="large"
        className={styles.search}
        prefix={<MagnifyingGlassIcon size={18} />}
        placeholder={t(($) => $.searchPlaceholder)}
        aria-label={t(($) => $.searchLabel)}
        value={targets.search}
        onChange={(event) => targets.setSearch(event.target.value)}
      />
      <Segmented
        block
        className={styles.tabs}
        options={[
          { label: t(($) => $.scopes.all), value: 'all' },
          { label: t(($) => $.scopes.direct), value: 'direct' },
          { label: t(($) => $.scopes.channels), value: 'channels' },
        ]}
        value={targets.scope}
        onChange={(value) => targets.setScope(value as typeof targets.scope)}
      />
      <ForwardTargetList
        groups={targets.groups}
        selected={selected}
        onSelect={onSelect}
        isLoading={targets.isLoading}
        isSearching={targets.isSearching}
        hasError={targets.hasError}
        retry={targets.retry}
        hasMore={targets.hasMore}
        loadingMore={targets.loadingMore}
        loadMore={targets.loadMore}
        searched={Boolean(targets.search.trim())}
      />
    </>
  );
}
