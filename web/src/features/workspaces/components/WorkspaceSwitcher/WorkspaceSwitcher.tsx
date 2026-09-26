import { CaretUpDownIcon, CheckIcon, PencilSimpleIcon, PlusIcon } from '@phosphor-icons/react';
import { Dropdown, Spin } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import { Avatar } from '../../../../shared/ui/Avatar/Avatar';
import { useActiveWorkspace } from '../../hooks/useActiveWorkspace';
import type { Workspace } from '../../types';
import { WorkspaceFormModal } from '../WorkspaceFormModal';

const useStyles = createStyles(({ token, css }) => ({
  trigger: css`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 44px;
    padding: 0 10px 0 6px;
    border-radius: ${token.borderRadius}px;
    border: none;
    background: transparent;
    cursor: pointer;
    max-width: 220px;
    color: ${token.colorText};
    transition: background 0.15s ease;

    &:hover,
    &[data-open='true'] {
      background: ${token.colorFillTertiary};
    }
  `,
  name: css`
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
    font-size: ${token.fontSize}px;
  `,
  caret: css`
    flex-shrink: 0;
    color: ${token.colorTextTertiary};
  `,
  panel: css`
    width: 280px;
    padding: 6px;
    border-radius: ${token.borderRadiusLG}px;
    background: ${token.colorBgElevated};
    box-shadow: ${token.boxShadowSecondary};
  `,
  label: css`
    padding: 8px 10px 4px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${token.colorTextTertiary};
  `,
  row: css`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 8px;
    border-radius: ${token.borderRadius}px;
    cursor: pointer;

    &:hover {
      background: ${token.colorFillTertiary};
    }

    &:hover [data-role='edit-button'] {
      opacity: 1;
    }
  `,
  rowName: css`
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 500;
  `,
  check: css`
    flex-shrink: 0;
    color: ${token.colorPrimary};
  `,
  editButton: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    flex-shrink: 0;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: ${token.colorTextTertiary};
    opacity: 0;
    transition: all 0.15s ease;

    &:hover {
      background: ${token.colorFillSecondary};
      color: ${token.colorPrimary};
    }

    @media (hover: none) {
      opacity: 1;
    }
  `,
  divider: css`
    height: 1px;
    margin: 6px 4px;
    background: ${token.colorBorderSecondary};
  `,
  createIcon: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    border-radius: ${token.borderRadius}px;
    border: 1.5px dashed ${token.colorBorder};
    color: ${token.colorTextTertiary};
  `,
  createLabel: css`
    color: ${token.colorTextSecondary};
    font-weight: 500;
  `,
  loading: css`
    display: flex;
    align-items: center;
    height: 44px;
    padding: 0 10px;
  `,
}));

type FormTarget = 'create' | Workspace | null;

// Sits where a static logo used to be: current workspace as the trigger,
// a Slack-style switch/create panel underneath. Editing an existing
// workspace reuses the same form as creating one (WorkspaceFormModal).
export function WorkspaceSwitcher() {
  const { styles, cx } = useStyles();
  const {
    workspace: activeWorkspace,
    workspaces,
    isLoading,
    selectWorkspace,
  } = useActiveWorkspace();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [formTarget, setFormTarget] = useState<FormTarget>(null);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spin size="small" />
      </div>
    );
  }

  function handleSelect(workspaceId: string) {
    selectWorkspace(workspaceId);
    setDropdownOpen(false);
  }

  function handleCreate() {
    setFormTarget('create');
    setDropdownOpen(false);
  }

  const panel = (
    <div className={styles.panel}>
      {(workspaces?.length ?? 0) > 0 && <div className={styles.label}>Робочі простори</div>}
      {(workspaces ?? []).map((item) => (
        <div key={item.id} className={styles.row} onClick={() => handleSelect(item.id)}>
          <Avatar path={item.avatarPath} alt={item.name} size={28} shape="rounded" />
          <span className={styles.rowName}>{item.name}</span>
          {item.id === activeWorkspace?.id && (
            <CheckIcon size={16} weight="bold" className={styles.check} />
          )}
          <button
            type="button"
            className={styles.editButton}
            data-role="edit-button"
            aria-label={`Редагувати ${item.name}`}
            onClick={(event) => {
              event.stopPropagation();
              setFormTarget(item);
              setDropdownOpen(false);
            }}
          >
            <PencilSimpleIcon size={14} />
          </button>
        </div>
      ))}
      {(workspaces?.length ?? 0) > 0 && <div className={styles.divider} />}
      <div className={styles.row} onClick={handleCreate}>
        <span className={styles.createIcon}>
          <PlusIcon size={14} />
        </span>
        <span className={cx(styles.rowName, styles.createLabel)}>Створити робочий простір</span>
      </div>
    </div>
  );

  return (
    <>
      <Dropdown
        open={dropdownOpen}
        onOpenChange={setDropdownOpen}
        trigger={['click']}
        placement="bottomLeft"
        popupRender={() => panel}
      >
        <button type="button" className={styles.trigger} data-open={dropdownOpen}>
          {activeWorkspace ? (
            <Avatar
              path={activeWorkspace.avatarPath}
              alt={activeWorkspace.name}
              size={30}
              shape="rounded"
            />
          ) : (
            <span className={styles.createIcon}>
              <PlusIcon size={14} />
            </span>
          )}
          <span className={styles.name}>{activeWorkspace?.name ?? 'Оберіть простір'}</span>
          <CaretUpDownIcon size={14} className={styles.caret} />
        </button>
      </Dropdown>
      <WorkspaceFormModal
        key={formTarget === null ? 'closed' : formTarget === 'create' ? 'create' : formTarget.id}
        open={formTarget !== null}
        workspace={formTarget && formTarget !== 'create' ? formTarget : undefined}
        onClose={() => setFormTarget(null)}
      />
    </>
  );
}
