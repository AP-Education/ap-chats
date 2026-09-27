import {
  CaretRightIcon,
  HashIcon,
  MagnifyingGlassIcon,
  NotePencilIcon,
} from '@phosphor-icons/react';
import { Button, Input } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { DirectMessageResults } from './DirectMessageResults';
import { FindPersonDialog } from './FindPersonDialog';

const useStyles = createStyles(({ token, css }) => ({
  root: css`
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
    background: ${token.colorBgContainer};
  `,
  header: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px 8px;
    font-weight: 650;
  `,
  search: css`
    padding: 0 12px 10px;
  `,
  list: css`
    min-height: 0;
    overflow-y: auto;
  `,
  allChats: css`
    position: sticky;
    top: 0;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 54px;
    padding: 8px 12px;
    border-bottom: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgContainer};
    color: ${token.colorText};
    font-weight: 600;
    text-decoration: none;

    &:hover {
      background: ${token.colorFillTertiary};
      color: ${token.colorText};
    }

    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: -2px;
    }
  `,
  allChatsIcon: css`
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    flex: 0 0 36px;
    border-radius: ${token.borderRadius}px;
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimary};
  `,
  allChatsArrow: css`
    margin-left: auto;
    color: ${token.colorTextQuaternary};
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
        <span>Особисті</span>
        <Button
          type="text"
          aria-label="Написати колезі"
          icon={<NotePencilIcon size={19} />}
          onClick={() => setComposeOpen(true)}
        />
      </div>
      <div className={styles.search}>
        <Input
          prefix={<MagnifyingGlassIcon size={16} />}
          placeholder="Розмова або колега"
          aria-label="Знайти розмову або колегу"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
      </div>
      <div className={styles.list}>
        <Link
          to="/channels"
          onClick={onNavigate}
          className={styles.allChats}
          aria-label="Всі чати: перейти до списку каналів"
        >
          <span className={styles.allChatsIcon} aria-hidden="true">
            <HashIcon size={20} />
          </span>
          <span>Всі чати</span>
          <CaretRightIcon className={styles.allChatsArrow} size={16} aria-hidden="true" />
        </Link>
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
