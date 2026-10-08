import { MagnifyingGlassIcon, NotePencilIcon } from '@phosphor-icons/react';
import { Button, Input } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import { DirectMessageResults } from './DirectMessageResults';
import { FindPersonDialog } from './FindPersonDialog';

const useStyles = createStyles(({ token, css }) => ({
  root: css`
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
  `,
  header: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px 8px;
    font-weight: 650;

    @media (max-width: ${token.screenMD}px) {
      min-height: 44px;
      padding: 6px 12px 4px;
      font-size: 16px;
    }
  `,
  search: css`
    padding: 0 12px 10px;

    @media (max-width: ${token.screenMD}px) {
      padding: 0 12px 8px;
    }
  `,
  list: css`
    min-height: 0;
    overflow-y: auto;
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

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span>Розмови</span>
        <Button
          type="text"
          aria-label="Написати колезі"
          icon={<NotePencilIcon size={22} />}
          onClick={() => setComposeOpen(true)}
        />
      </div>
      <div className={styles.search}>
        <Input
          prefix={<MagnifyingGlassIcon size={20} />}
          placeholder="Розмова або колега"
          aria-label="Знайти розмову або колегу"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
      </div>
      <div className={styles.list}>
        <DirectMessageResults
          workspaceId={workspaceId}
          filter={filter}
          onCompose={() => setComposeOpen(true)}
          onNavigate={onNavigate}
        />
      </div>
      <FindPersonDialog
        workspaceId={workspaceId}
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        onNavigate={onNavigate}
      />
    </div>
  );
}
