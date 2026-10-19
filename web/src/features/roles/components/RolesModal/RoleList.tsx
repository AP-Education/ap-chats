import { ContentState, ContentStateDescription } from '@ap-education/ui';
import { DotsSixVerticalIcon, UserIcon } from '@phosphor-icons/react';
import { Button, Skeleton } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { moveRole } from '../../role-order';
import type { Role } from '../../types';
import { RoleDot } from '../RoleDot';

const useStyles = createStyles(({ token, css }) => ({
  list: css`
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
  `,
  item: css`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-height: 36px;
    padding: 6px 8px;
    border: 0;
    border-radius: ${token.borderRadius}px;
    background: transparent;
    color: ${token.colorText};
    font: inherit;
    text-align: left;
    cursor: pointer;

    &:hover {
      background: ${token.colorFillTertiary};
    }

    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: -2px;
    }

    &:hover [data-role='drag-handle'] {
      opacity: 1;
    }
  `,
  handle: css`
    flex-shrink: 0;
    margin-left: -4px;
    color: ${token.colorTextTertiary};
    opacity: 0;
    cursor: grab;
  `,
  dropTarget: css`
    box-shadow: inset 0 2px 0 ${token.colorPrimary};
  `,
  dragging: css`
    opacity: 0.5;
  `,
  selected: css`
    && {
      background: ${token.colorPrimaryBg};
      box-shadow: inset 0 0 0 1px ${token.colorPrimaryBorder};
    }
  `,
  name: css`
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  count: css`
    display: inline-flex;
    align-items: center;
    gap: 3px;
    color: ${token.colorTextTertiary};
    font-size: ${token.fontSizeSM}px;
    font-variant-numeric: tabular-nums;
  `,
}));

interface RoleListProps {
  roles: Role[] | undefined;
  isError: boolean;
  selectedRoleId: string | undefined;
  onSelect: (roleId: string) => void;
  /** Present where roles can be dragged into a new order. */
  onReorder?: (roleIds: string[]) => void;
  onRetry: () => void;
}

export function RoleList({
  roles,
  isError,
  selectedRoleId,
  onSelect,
  onReorder,
  onRetry,
}: RoleListProps) {
  const { styles, cx } = useStyles();
  const { t } = useTranslation(['roles', 'common']);
  const [draggingId, setDraggingId] = useState<string>();
  const [targetId, setTargetId] = useState<string>();

  function drop(roleId: string) {
    if (roles && draggingId)
      onReorder?.(
        moveRole(
          roles.map((role) => role.id),
          draggingId,
          roleId,
        ),
      );
    setDraggingId(undefined);
    setTargetId(undefined);
  }

  if (isError && !roles) {
    return (
      <div role="alert">
        {t(($) => $.list.loadFailed)}
        <Button type="link" onClick={onRetry}>
          {t(($) => $.common.actions.retry)}
        </Button>
      </div>
    );
  }

  if (!roles) return <Skeleton active title={false} paragraph={{ rows: 4 }} />;

  if (!roles.length) {
    return (
      <ContentState compact>
        <ContentStateDescription>{t(($) => $.empty)}</ContentStateDescription>
      </ContentState>
    );
  }

  return (
    <ul className={styles.list}>
      {roles.map((role) => (
        <li
          key={role.id}
          draggable={Boolean(onReorder)}
          className={cx(
            role.id === targetId && role.id !== draggingId && styles.dropTarget,
            role.id === draggingId && styles.dragging,
          )}
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = 'move';
            setDraggingId(role.id);
          }}
          onDragOver={(event) => {
            if (!draggingId) return;
            event.preventDefault();
            setTargetId(role.id);
          }}
          onDrop={() => drop(role.id)}
          onDragEnd={() => {
            setDraggingId(undefined);
            setTargetId(undefined);
          }}
        >
          <button
            type="button"
            className={cx(styles.item, role.id === selectedRoleId && styles.selected)}
            aria-current={role.id === selectedRoleId}
            onClick={() => onSelect(role.id)}
          >
            {onReorder && (
              <DotsSixVerticalIcon size={16} className={styles.handle} data-role="drag-handle" />
            )}
            <RoleDot color={role.color} />
            <span className={styles.name}>{role.name}</span>
            <span
              className={styles.count}
              aria-label={t(($) => $.list.memberCount, { people: role.memberCount })}
            >
              <UserIcon size={12} aria-hidden />
              {role.memberCount}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
