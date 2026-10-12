import { HashIcon } from '@phosphor-icons/react';
import { Form, Input, message, Select, Skeleton } from 'antd';
import { createStyles } from 'antd-style';
import { useEffect, useState } from 'react';
import { useMatch, useNavigate } from 'react-router-dom';

import { ApiError } from '@/shared/api/http';
import { AdaptiveModal } from '@/shared/ui/AdaptiveModal';

import { ChannelAccessEditor } from '../../../channel-access/components/ChannelAccessEditor';
import { useChannelPermissions } from '../../../channel-access/hooks/useChannelPermissions';
import { openChannelPermissions, toPermissionsInput } from '../../../channel-access/principals';
import type { ChannelPermissionsInput } from '../../../channel-access/types';
import { useChannelCategories } from '../../../channel-categories/hooks/useChannelCategories';
import { useChannelActions } from '../../hooks/useChannelActions';
import type { Channel } from '../../types';
import { DeleteChannelAction } from './DeleteChannelAction';

type ChannelFormSection = 'general' | 'access';

const sections: { key: ChannelFormSection; label: string }[] = [
  { key: 'general', label: 'Загальне' },
  { key: 'access', label: 'Доступ' },
];

const useStyles = createStyles(({ token, css }) => ({
  // Fills the fixed-height body, so the danger zone can rest at its foot.
  form: css`
    display: flex;
    flex-direction: column;
    min-height: 100%;
  `,
  pane: css`
    display: flex;
    flex: 1;
    flex-direction: column;

    &[hidden] {
      display: none;
    }
  `,
  nameInput: css`
    .ant-input-prefix {
      color: ${token.colorTextTertiary};
      margin-inline-end: 4px;
    }
  `,
}));

interface ChannelFormValues {
  name: string;
  categoryId?: string;
  permissions: ChannelPermissionsInput;
}

interface ChannelFormModalProps {
  workspaceId: string;
  open: boolean;
  onClose: () => void;
  /** Present to edit that channel; absent to create a new one. */
  channel?: Channel;
  /** Create mode only: which category the new channel is created into. */
  categoryId?: string;
  /** Create mode only: label for the category context breadcrumb. */
  categoryName?: string;
}

export function ChannelFormModal({
  workspaceId,
  open,
  onClose,
  channel,
  categoryId,
  categoryName,
}: ChannelFormModalProps) {
  const { styles } = useStyles();
  const [form] = Form.useForm<ChannelFormValues>();
  const { query: categoriesQuery } = useChannelCategories(workspaceId);
  const { create, update, remove } = useChannelActions(workspaceId);
  const permissions = useChannelPermissions(
    workspaceId,
    channel?.id ?? '',
    Boolean(open && channel),
  );
  const navigate = useNavigate();
  // Opened from the sidebar too, which sits outside the route tree, so read the URL.
  const routedChannelId = useMatch('/channels/:channelId')?.params.channelId;
  const [nameError, setNameError] = useState<string>();
  const [section, setSection] = useState<ChannelFormSection>('general');

  const currentPermissions = permissions.query.data;
  useEffect(() => {
    if (currentPermissions && !form.isFieldTouched('permissions'))
      form.setFieldValue('permissions', toPermissionsInput(currentPermissions));
  }, [currentPermissions, form]);

  const isPending = create.isPending || update.isPending || permissions.change.isPending;
  const categoryOptions = (categoriesQuery.data ?? []).map((category) => ({
    label: category.name,
    value: category.id,
  }));

  function handleClose() {
    form.resetFields();
    setNameError(undefined);
    setSection('general');
    onClose();
  }

  async function handleDelete() {
    if (!channel) return;
    const wasOpen = routedChannelId === channel.id;
    if (wasOpen) navigate('/channels', { replace: true });
    try {
      await remove.mutateAsync(channel.id);
      if (!wasOpen) handleClose();
    } catch {
      void message.error('Не вдалося видалити канал.');
    }
  }

  async function saveChanges(existing: Channel, values: ChannelFormValues) {
    const detailsChanged = form.isFieldsTouched(['name', 'categoryId']);
    const accessChanged = form.isFieldTouched('permissions');

    if (detailsChanged)
      await update.mutateAsync({
        channelId: existing.id,
        input: { name: values.name.trim(), categoryId: values.categoryId ?? null },
      });
    if (accessChanged) await permissions.change.mutateAsync(values.permissions);
  }

  async function handleFinish(values: ChannelFormValues) {
    setNameError(undefined);
    try {
      if (channel) {
        await saveChanges(channel, values);
      } else {
        const created = await create.mutateAsync({
          name: values.name.trim(),
          categoryId,
          permissions: values.permissions,
        });
        navigate(`/channels/${created.id}`);
      }
      handleClose();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setNameError('Канал із такою назвою вже існує');
        return;
      }
      void message.error('Не вдалося зберегти канал.');
    }
  }

  const nameField = (
    <Form.Item
      label="Назва каналу"
      name="name"
      validateStatus={nameError ? 'error' : undefined}
      help={nameError}
      rules={[
        { required: true, message: 'Введіть назву' },
        { max: 80, message: 'Максимум 80 символів' },
      ]}
    >
      <Input
        className={styles.nameInput}
        prefix={<HashIcon size={16} />}
        placeholder="загальне"
        autoFocus={!channel}
        disabled={remove.isPending}
        onChange={() => setNameError(undefined)}
      />
    </Form.Item>
  );

  const accessField = (
    <Form.Item name="permissions" noStyle>
      <ChannelAccessEditor workspaceId={workspaceId} disabled={remove.isPending} />
    </Form.Item>
  );

  return (
    <AdaptiveModal
      open={open}
      onCancel={handleClose}
      onOk={() => form.submit()}
      confirmLoading={isPending}
      okButtonProps={{ disabled: remove.isPending }}
      okText={channel ? 'Зберегти' : 'Створити'}
      cancelText="Скасувати"
      title={channel ? 'Налаштування каналу' : 'Новий канал'}
      description={
        channel
          ? 'Назва, категорія та доступ до каналу'
          : categoryId
            ? `у категорії «${categoryName}»`
            : 'Назва та доступ до каналу'
      }
      tabs={
        channel && {
          items: sections,
          activeKey: section,
          onChange: setSection,
        }
      }
      bodyHeight="min(440px, 62vh)"
      destroyOnHidden
      centered
      width={520}
    >
      <Form<ChannelFormValues>
        form={form}
        className={styles.form}
        layout="vertical"
        requiredMark={false}
        initialValues={{
          name: channel?.name,
          categoryId: channel?.categoryId ?? undefined,
          permissions: channel ? undefined : openChannelPermissions,
        }}
        onFinish={handleFinish}
      >
        {channel ? (
          <>
            <div className={styles.pane} hidden={section !== 'general'}>
              {nameField}
              <Form.Item label="Категорія" name="categoryId">
                <Select
                  allowClear
                  disabled={remove.isPending}
                  placeholder="Без категорії"
                  options={categoryOptions}
                />
              </Form.Item>
              <DeleteChannelAction
                isPending={remove.isPending}
                onDelete={() => void handleDelete()}
              />
            </div>
            <div className={styles.pane} hidden={section !== 'access'}>
              {currentPermissions ? accessField : <Skeleton active paragraph={{ rows: 5 }} />}
            </div>
          </>
        ) : (
          <>
            {nameField}
            <Form.Item label="Доступ">{accessField}</Form.Item>
          </>
        )}
      </Form>
    </AdaptiveModal>
  );
}
