import { PanelHeader, PanelTitle } from '@ap-education/ui';
import { MagnifyingGlassIcon, NotePencilIcon } from '@phosphor-icons/react';
import { Button, Input } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import { PanelHeaderActions } from '@/shared/ui/PanelHeaderActions';

import { DirectMessageResults } from './DirectMessageResults';
import { FindPersonDialog } from './FindPersonDialog';

const useStyles = createStyles(({ token, css }) => ({
  root: css`
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
  `,
  search: css`
    padding: 0 8px 10px;

    @media (max-width: ${token.screenMD}px) {
      padding-bottom: 8px;
    }
  `,
  list: css`
    min-height: 0;
    overflow-y: auto;
    padding-bottom: var(--shell-footer-space, 0px);
  `,
}));

export function DirectMessageList({
  workspaceId,
  onNavigate,
}: {
  workspaceId: string;
  onNavigate?: () => void;
}) {
  const { styles } = useStyles();
  const [filter, setFilter] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);

  // Opening a conversation ends the search, as in Telegram: the list returns whole.
  function navigated() {
    setFilter('');
    onNavigate?.();
  }

  return (
    <div className={styles.root}>
      <PanelHeader>
        <PanelTitle>Розмови</PanelTitle>
        <PanelHeaderActions>
          <Button
            type="text"
            aria-label="Написати колезі"
            icon={<NotePencilIcon size={22} />}
            onClick={() => setComposeOpen(true)}
          />
        </PanelHeaderActions>
      </PanelHeader>
      <div className={styles.search}>
        <Input
          prefix={<MagnifyingGlassIcon size={20} />}
          placeholder="Розмова або колега"
          aria-label="Знайти розмову або колегу"
          allowClear
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setFilter('');
          }}
        />
      </div>
      <div className={styles.list}>
        <DirectMessageResults
          workspaceId={workspaceId}
          filter={filter}
          onCompose={() => setComposeOpen(true)}
          onNavigate={navigated}
        />
      </div>
      <FindPersonDialog
        workspaceId={workspaceId}
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        onNavigate={navigated}
      />
    </div>
  );
}
