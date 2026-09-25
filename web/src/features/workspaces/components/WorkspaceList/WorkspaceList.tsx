import { PencilSimpleIcon, PlusIcon } from '@phosphor-icons/react';
import { Menu, type MenuProps, Spin } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import { Avatar } from '../../../../shared/ui/Avatar/Avatar';
import { useWorkspaces } from '../../hooks/useWorkspaces';
import type { Workspace } from '../../types';
import { WorkspaceFormModal } from '../WorkspaceFormModal';

const useStyles = createStyles(({ token, css }) => ({
  menu: css`
    background: transparent;
    border-inline-end: none !important;
  `,
  sectionLabel: css`
    padding: ${token.paddingSM}px 16px ${token.paddingXS}px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${token.colorTextTertiary};

    @media (max-width: ${token.screenMD}px) {
      padding-left: 12px;
      padding-right: 12px;
    }
  `,
  loading: css`
    display: flex;
    padding: ${token.paddingSM}px 16px;

    @media (max-width: ${token.screenMD}px) {
      padding-left: 12px;
      padding-right: 12px;
    }
  `,
  row: css`
    display: flex;
    align-items: center;
    gap: ${token.marginSM}px;
    min-width: 0;
  `,
  rowItem: css`
    height: auto !important;
    min-height: 56px;
    padding-top: ${token.paddingXS}px !important;
    padding-bottom: ${token.paddingXS}px !important;

    .ant-menu-title-content {
      line-height: normal !important;
    }
  `,
  name: css`
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: ${token.fontSizeLG}px;
    font-weight: 600;
  `,
  editButton: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: ${token.colorTextTertiary};
    opacity: 0;
    transition: all 0.15s ease;

    &:hover {
      background: ${token.colorFillTertiary};
      color: ${token.colorPrimary};
    }

    /* Touch input has no hover, so :hover-only reveal would make this
       permanently unreachable — keep it visible and give it a real tap target. */
    @media (hover: none) {
      opacity: 1;
      width: 36px;
      height: 36px;
    }
  `,
  workspaceItem: css`
    &:hover [data-role='edit-button'] {
      opacity: 1;
    }
  `,
  createIcon: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    border-radius: 12px;
    border: 1.5px dashed ${token.colorBorder};
    color: ${token.colorTextTertiary};
    transition: all 0.15s ease;
  `,
  createLabel: css`
    color: ${token.colorTextSecondary};
    font-weight: 500;
    transition: color 0.15s ease;
  `,
  createItem: css`
    &:hover [data-role='create-icon'] {
      border-color: ${token.colorPrimary};
      border-style: solid;
      color: ${token.colorPrimary};
    }

    &:hover [data-role='create-label'] {
      color: ${token.colorPrimary};
    }
  `,
}));

interface WorkspaceListProps {
  onNavigate?: () => void;
}

type FormTarget = 'create' | Workspace | null;

// Workspaces as a real, always-visible section of the sider's own menu list,
// directly continuing the nav items. Each row is a small card: a properly
// sized avatar + a name that reads as a title, not a cramped Menu icon+label.
// Editing an existing workspace reuses the same create form (WorkspaceFormModal).
export function WorkspaceList({ onNavigate }: WorkspaceListProps) {
  const { styles, cx } = useStyles();
  const { data: workspaces, isLoading } = useWorkspaces();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [formTarget, setFormTarget] = useState<FormTarget>(null);

  const activeWorkspace =
    workspaces?.find((workspace) => workspace.id === activeId) ?? workspaces?.[0];

  const items: MenuProps['items'] = [
    ...(workspaces ?? []).map((workspace) => ({
      key: workspace.id,
      className: cx(styles.rowItem, styles.workspaceItem),
      label: (
        <span className={styles.row}>
          <Avatar path={workspace.avatarPath} alt={workspace.name} size={36} shape="rounded" />
          <span className={styles.name}>{workspace.name}</span>
          <button
            type="button"
            className={styles.editButton}
            data-role="edit-button"
            aria-label={`Редагувати ${workspace.name}`}
            onClick={(event) => {
              event.stopPropagation();
              setFormTarget(workspace);
            }}
          >
            <PencilSimpleIcon size={16} />
          </button>
        </span>
      ),
    })),
    {
      key: 'create-workspace',
      className: cx(styles.rowItem, styles.createItem),
      label: (
        <span className={styles.row}>
          <span className={styles.createIcon} data-role="create-icon">
            <PlusIcon size={18} />
          </span>
          <span className={styles.createLabel} data-role="create-label">
            Створити
          </span>
        </span>
      ),
    },
  ];

  const handleClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'create-workspace') {
      setFormTarget('create');
      return;
    }
    setActiveId(key);
    onNavigate?.();
  };

  return (
    <>
      <div className={styles.sectionLabel}>Робочі простори</div>
      {isLoading ? (
        <div className={styles.loading}>
          <Spin size="small" />
        </div>
      ) : (
        <Menu
          mode="inline"
          selectedKeys={activeWorkspace ? [activeWorkspace.id] : []}
          items={items}
          onClick={handleClick}
          className={styles.menu}
        />
      )}
      <WorkspaceFormModal
        key={formTarget === null ? 'closed' : formTarget === 'create' ? 'create' : formTarget.id}
        open={formTarget !== null}
        workspace={formTarget && formTarget !== 'create' ? formTarget : undefined}
        onClose={() => setFormTarget(null)}
      />
    </>
  );
}
