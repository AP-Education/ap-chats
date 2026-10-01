import { CaretUpDownIcon, CheckIcon, PencilLineIcon, PlusIcon } from '@phosphor-icons/react';
import { Dropdown, Skeleton } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Avatar } from '../../../../shared/ui/Avatar/Avatar';
import { useActiveWorkspace } from '../../hooks/useActiveWorkspace';
import type { Workspace } from '../../types';
import { WorkspaceFormModal } from '../WorkspaceFormModal';

const useStyles = createStyles(({ token, css }) => ({
  trigger: css`
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-width: 0;
    height: 60px;
    padding: 0 16px;
    border-radius: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    color: ${token.colorText};
    text-align: left;
    transition: background 0.15s ease;

    @media (max-width: ${token.screenMD}px) {
      height: 56px;
      padding-inline: 16px;
    }

    &:hover,
    &[data-open='true'] {
      background: ${token.colorFillTertiary};
    }
  `,
  name: css`
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
    font-size: 16px;
  `,
  caret: css`
    flex-shrink: 0;
    color: ${token.colorTextTertiary};
  `,
  panel: css`
    box-sizing: border-box;
    width: 100%;
    max-height: min(520px, calc(100vh - 80px));
    overflow-y: auto;
    padding: 8px 0;
    background: ${token.colorBgElevated};
    box-shadow: ${token.boxShadowSecondary};
  `,
  popup: css`
    width: 100%;
  `,
  label: css`
    padding: 8px 20px 10px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${token.colorTextTertiary};
  `,
  row: css`
    display: flex;
    align-items: center;

    &:hover {
      background: ${token.colorFillTertiary};
    }

    &[data-active='true'] {
      background: ${token.colorPrimaryBg};
    }

    &[data-active='true']:hover {
      background: ${token.colorPrimaryBgHover};
    }

    &:hover [data-role='edit-button'],
    &:focus-within [data-role='edit-button'] {
      opacity: 1;
    }

    &:hover [data-role='active-check'],
    &:focus-within [data-role='active-check'] {
      opacity: 0;
    }
  `,
  rowMain: css`
    display: flex;
    flex: 1;
    align-items: center;
    gap: 10px;
    min-width: 0;
    min-height: 56px;
    padding: 6px 20px;
    border: 0;
    background: transparent;
    color: ${token.colorText};
    cursor: pointer;
    text-align: left;

    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: -2px;
    }
  `,
  rowName: css`
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 15px;
    font-weight: 600;
  `,
  check: css`
    position: absolute;
    inset: 0;
    margin: auto;
    pointer-events: none;
    color: ${token.colorPrimary};
    transition: opacity 0.15s ease;
  `,
  trailing: css`
    position: relative;
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    margin-right: 12px;
    flex-shrink: 0;
  `,
  editButton: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
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

    &:focus-visible {
      opacity: 1;
      outline: 2px solid ${token.colorPrimary};
    }

    @media (hover: none) {
      opacity: 1;
    }
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
  createActionIcon: css`
    width: 40px;
    height: 40px;
    border: 0;
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimary};
  `,
  createLabel: css`
    color: ${token.colorPrimary};
    font-weight: 600;
  `,
  loading: css`
    display: flex;
    align-items: center;
    width: 100%;
    height: 60px;
    padding: 0 16px;
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
    isError,
    retry,
    selectWorkspace,
  } = useActiveWorkspace();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [formTarget, setFormTarget] = useState<FormTarget>(null);
  const navigate = useNavigate();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Skeleton.Input active size="small" style={{ width: 150 }} />
      </div>
    );
  }

  if (isError && !workspaces) {
    return (
      <button type="button" className={styles.trigger} onClick={retry}>
        Повторити завантаження
      </button>
    );
  }

  function handleSelect(workspaceId: string) {
    selectWorkspace(workspaceId);
    if (workspaceId !== activeWorkspace?.id) {
      if (location.pathname.startsWith('/channels/')) navigate('/channels');
      if (location.pathname.startsWith('/direct/')) navigate('/direct');
    }
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
        <div key={item.id} className={styles.row} data-active={item.id === activeWorkspace?.id}>
          <button
            type="button"
            className={styles.rowMain}
            aria-pressed={item.id === activeWorkspace?.id}
            onClick={() => handleSelect(item.id)}
          >
            <Avatar path={item.avatarPath} alt={item.name} size={40} shape="rounded" />
            <span className={styles.rowName}>{item.name}</span>
          </button>
          <span className={styles.trailing}>
            {item.id === activeWorkspace?.id && (
              <CheckIcon
                size={20}
                weight="bold"
                className={styles.check}
                data-role="active-check"
              />
            )}
            <button
              type="button"
              className={styles.editButton}
              data-role="edit-button"
              aria-label={`Редагувати ${item.name}`}
              onClick={() => {
                setFormTarget(item);
                setDropdownOpen(false);
              }}
            >
              <PencilLineIcon size={20} />
            </button>
          </span>
        </div>
      ))}
      <div className={styles.row}>
        <button type="button" className={styles.rowMain} onClick={handleCreate}>
          <span className={cx(styles.createIcon, styles.createActionIcon)}>
            <PlusIcon size={20} />
          </span>
          <span className={cx(styles.rowName, styles.createLabel)}>Створити робочий простір</span>
        </button>
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
        getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
        classNames={{ root: styles.popup }}
        popupRender={() => panel}
      >
        <button type="button" className={styles.trigger} data-open={dropdownOpen}>
          {activeWorkspace ? (
            <Avatar
              path={activeWorkspace.avatarPath}
              alt={activeWorkspace.name}
              size={44}
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
