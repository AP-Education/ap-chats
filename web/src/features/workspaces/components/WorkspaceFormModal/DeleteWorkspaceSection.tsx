import { TrashIcon } from '@phosphor-icons/react';
import { Button, message, Popconfirm } from 'antd';
import { createStyles } from 'antd-style';

import { useDeleteWorkspace } from '../../hooks/useDeleteWorkspace';
import { useLeaveWorkspaceRoute } from '../../hooks/useLeaveWorkspaceRoute';
import { useWorkspaceMemberLabels } from '../../hooks/useWorkspaceMemberLabels';
import type { Workspace } from '../../types';

const useStyles = createStyles(({ token, css }) => ({
  section: css`
    padding-top: ${token.paddingSM}px;
    border-top: 1px solid ${token.colorBorderSecondary};
  `,
}));

interface DeleteWorkspaceSectionProps {
  workspace: Workspace;
  onDeleted: () => void;
}

export function DeleteWorkspaceSection({ workspace, onDeleted }: DeleteWorkspaceSectionProps) {
  const { styles } = useStyles();
  const { currentMember } = useWorkspaceMemberLabels(workspace.id);
  const remove = useDeleteWorkspace();
  const leaveWorkspaceRoute = useLeaveWorkspaceRoute();

  if (currentMember?.role !== 'owner') return null;

  async function handleDelete() {
    try {
      await remove.mutateAsync(workspace.id);
    } catch {
      void message.error('Не вдалося видалити робочий простір.');
      return;
    }

    leaveWorkspaceRoute();
    onDeleted();
    void message.success(`Робочий простір «${workspace.name}» видалено`);
  }

  return (
    <div className={styles.section}>
      <Popconfirm
        title={`Видалити робочий простір «${workspace.name}»?`}
        description="Канали, повідомлення та учасники зникнуть назавжди."
        okText="Видалити"
        okButtonProps={{ danger: true, loading: remove.isPending }}
        cancelText="Скасувати"
        onConfirm={() => void handleDelete()}
      >
        <Button type="text" danger loading={remove.isPending} icon={<TrashIcon size={18} />}>
          Видалити робочий простір
        </Button>
      </Popconfirm>
    </div>
  );
}
