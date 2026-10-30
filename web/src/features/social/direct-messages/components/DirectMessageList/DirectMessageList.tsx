import { PanelHeader, PanelTitle } from '@ap-education/ui';
import { NotePencilIcon } from '@phosphor-icons/react';
import { Button } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import { PanelHeaderActions } from '@/shared/ui/PanelHeaderActions';

import { DirectMessageResults } from './DirectMessageResults';
import { FindPersonDialog } from './FindPersonDialog';

const useStyles = createStyles(({ css }) => ({
  root: css`
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
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
  const [composeOpen, setComposeOpen] = useState(false);

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
      <div className={styles.list}>
        <DirectMessageResults onCompose={() => setComposeOpen(true)} onNavigate={onNavigate} />
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
