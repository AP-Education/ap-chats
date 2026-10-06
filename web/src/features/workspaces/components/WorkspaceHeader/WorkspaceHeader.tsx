import { CaretDownIcon, PencilLineIcon, PlusIcon } from '@phosphor-icons/react';
import { Dropdown, Skeleton } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import { useActiveWorkspace } from '../../hooks/useActiveWorkspace';
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
  popup: css`
    width: 100%;
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
  loading: css`
    display: flex;
    align-items: center;
    width: 100%;
    height: 60px;
    padding: 0 16px;
  `,
}));

// The active workspace's name opens its actions. Switching and creating workspaces live in the
// shell rail, so the header carries no avatar and no switcher affordance.
export function WorkspaceHeader() {
  const { styles } = useStyles();
  const { workspace, workspaces, isLoading, isError, retry } = useActiveWorkspace();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);

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

  if (!workspace) {
    return (
      <div className={styles.trigger}>
        <span className={styles.createIcon}>
          <PlusIcon size={14} />
        </span>
        <span className={styles.name}>Створіть робочий простір</span>
      </div>
    );
  }

  return (
    <>
      <Dropdown
        open={menuOpen}
        onOpenChange={setMenuOpen}
        trigger={['click']}
        placement="bottomLeft"
        getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
        classNames={{ root: styles.popup }}
        menu={{
          items: [
            {
              key: 'edit',
              icon: <PencilLineIcon size={18} />,
              label: 'Редагувати робочий простір',
              onClick: () => setEditing(true),
            },
          ],
        }}
      >
        <button type="button" className={styles.trigger} data-open={menuOpen}>
          <span className={styles.name}>{workspace.name}</span>
          <CaretDownIcon size={14} className={styles.caret} />
        </button>
      </Dropdown>
      <WorkspaceFormModal
        key={workspace.id}
        open={editing}
        workspace={workspace}
        onClose={() => setEditing(false)}
      />
    </>
  );
}
