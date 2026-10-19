import { Form, message, Modal, Typography } from 'antd';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';

import { useCreateWorkspace } from '../../hooks/useCreateWorkspace';
import { useUpdateWorkspace } from '../../hooks/useUpdateWorkspace';
import type { Workspace } from '../../types';
import { WorkspaceForm, type WorkspaceFormValues } from '../WorkspaceForm';

const useStyles = createStyles(({ token, css }) => ({
  header: css`
    text-align: center;
    margin-bottom: ${token.marginLG}px;
  `,
  title: css`
    margin-bottom: 4px !important;
  `,
  description: css`
    color: ${token.colorTextSecondary};
  `,
}));

interface WorkspaceFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Present to edit that workspace; absent to create a new one. */
  workspace?: Workspace;
}

// Modal chrome + deciding which mutation a submitted WorkspaceForm goes to.
// The form itself (and the avatar picker inside it) don't know this modal,
// create/edit, or the API exist.
export function WorkspaceFormModal({ open, onClose, workspace }: WorkspaceFormModalProps) {
  const { styles } = useStyles();
  const { t } = useTranslation(['workspaces', 'common']);
  const isEditing = Boolean(workspace);
  const [form] = Form.useForm<{ name: string }>();
  const createWorkspace = useCreateWorkspace();
  const updateWorkspace = useUpdateWorkspace();

  function handleClose() {
    form.resetFields();
    onClose();
  }

  async function handleFinish(values: WorkspaceFormValues) {
    try {
      if (workspace) {
        await updateWorkspace.mutateAsync({ workspaceId: workspace.id, input: values });
      } else {
        await createWorkspace.mutateAsync(values);
      }
      handleClose();
    } catch {
      void message.error(t(($) => $.modal.saveFailed));
    }
  }

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      onOk={() => form.submit()}
      confirmLoading={createWorkspace.isPending || updateWorkspace.isPending}
      okText={isEditing ? t(($) => $.common.actions.save) : t(($) => $.common.actions.create)}
      cancelText={t(($) => $.common.actions.cancel)}
      destroyOnHidden
      centered
    >
      <div className={styles.header}>
        <Typography.Title level={4} className={styles.title}>
          {isEditing ? t(($) => $.modal.editTitle) : t(($) => $.modal.createTitle)}
        </Typography.Title>
        <Typography.Text className={styles.description}>
          {t(($) => $.modal.description)}
        </Typography.Text>
      </div>

      <WorkspaceForm
        form={form}
        initialValues={
          workspace
            ? { name: workspace.name, avatarPath: workspace.avatarPath ?? undefined }
            : undefined
        }
        onFinish={handleFinish}
      />
    </Modal>
  );
}
