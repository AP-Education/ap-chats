import { Form, Modal, Typography } from 'antd';
import { createStyles } from 'antd-style';

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
  const isEditing = Boolean(workspace);
  const [form] = Form.useForm<{ name: string }>();
  const createWorkspace = useCreateWorkspace();
  const updateWorkspace = useUpdateWorkspace();

  function handleClose() {
    form.resetFields();
    onClose();
  }

  async function handleFinish(values: WorkspaceFormValues) {
    if (workspace) {
      await updateWorkspace.mutateAsync({ workspaceId: workspace.id, input: values });
    } else {
      await createWorkspace.mutateAsync(values);
    }
    handleClose();
  }

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      onOk={() => form.submit()}
      confirmLoading={createWorkspace.isPending || updateWorkspace.isPending}
      okText={isEditing ? 'Зберегти' : 'Створити'}
      cancelText="Скасувати"
      destroyOnHidden
      centered
    >
      <div className={styles.header}>
        <Typography.Title level={4} className={styles.title}>
          {isEditing ? 'Редагувати робочий простір' : 'Налаштуйте робочий простір'}
        </Typography.Title>
        <Typography.Text className={styles.description}>
          Додайте назву та іконку. Це завжди можна змінити пізніше.
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
