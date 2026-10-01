import { HashIcon, TrashIcon } from '@phosphor-icons/react';
import { Button, Form, Input, message, Modal, Popconfirm, Select, Typography } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ApiError } from '@/shared/api/http';

import { useChannelCategories } from '../../../channel-categories/hooks/useChannelCategories';
import { useChannelActions } from '../../hooks/useChannelActions';
import type { Channel, ChannelKind } from '../../types';
import { ChannelKindPicker } from './ChannelKindPicker';

const useStyles = createStyles(({ token, css }) => ({
  modal: css`
    @media (max-width: ${token.screenSM}px) {
      width: calc(100vw - 24px) !important;
      max-width: 440px;

      :global(.ant-modal-content) {
        padding-block: 20px 16px;
        border-radius: 16px;
      }

      :global(.ant-modal-footer) {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 20px;
      }

      :global(.ant-modal-footer .ant-btn) {
        min-height: 44px;
        margin-inline-start: 0;
      }

      :global(.ant-form-item) {
        margin-bottom: 18px;
      }
    }
  `,
  header: css`
    margin-bottom: ${token.marginLG}px;
    @media (max-width: ${token.screenSM}px) {
      margin-bottom: 20px;
      padding-right: 28px;
    }
  `,
  title: css`
    margin-bottom: 4px !important;
  `,
  breadcrumb: css`
    color: ${token.colorTextSecondary};
  `,
  nameInput: css`
    :global(.ant-input-prefix) {
      color: ${token.colorTextTertiary};
      margin-inline-end: 4px;
    }
  `,
  settingsActions: css`
    padding-top: ${token.paddingSM}px;
    border-top: 1px solid ${token.colorBorderSecondary};
  `,
}));

interface ChannelFormValues {
  name: string;
  kind: ChannelKind;
  categoryId?: string;
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
  const isEditing = Boolean(channel);
  const [form] = Form.useForm<ChannelFormValues>();
  const { query: categoriesQuery } = useChannelCategories(workspaceId);
  const { create, update, remove } = useChannelActions(workspaceId);
  const navigate = useNavigate();
  const { channelId: routedChannelId } = useParams<{ channelId?: string }>();
  const [nameError, setNameError] = useState<string>();

  const isPending = create.isPending || update.isPending;
  const categoryOptions = (categoriesQuery.data ?? []).map((category) => ({
    label: category.name,
    value: category.id,
  }));

  function handleClose() {
    form.resetFields();
    setNameError(undefined);
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

  async function handleFinish(values: ChannelFormValues) {
    setNameError(undefined);
    try {
      if (channel) {
        await update.mutateAsync({
          channelId: channel.id,
          input: { name: values.name.trim(), categoryId: values.categoryId ?? null },
        });
      } else {
        const created = await create.mutateAsync({
          name: values.name.trim(),
          kind: values.kind,
          categoryId,
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

  return (
    <Modal
      className={styles.modal}
      open={open}
      onCancel={handleClose}
      onOk={() => form.submit()}
      confirmLoading={isPending}
      okButtonProps={{ disabled: remove.isPending }}
      okText={isEditing ? 'Зберегти' : 'Створити'}
      cancelText="Скасувати"
      destroyOnHidden
      centered
      width={440}
    >
      <div className={styles.header}>
        <Typography.Title level={4} className={styles.title}>
          {isEditing ? 'Налаштування каналу' : 'Новий канал'}
        </Typography.Title>
        <Typography.Text className={styles.breadcrumb}>
          {isEditing ? 'Назва, категорія та доступність каналу' : `у категорії «${categoryName}»`}
        </Typography.Text>
      </div>

      <Form<ChannelFormValues>
        form={form}
        layout="vertical"
        initialValues={{
          name: channel?.name,
          kind: channel?.kind ?? 'public',
          categoryId: channel?.categoryId ?? undefined,
        }}
        onFinish={handleFinish}
      >
        {!isEditing && (
          <Form.Item label="Тип каналу" name="kind">
            <ChannelKindPicker />
          </Form.Item>
        )}

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
            prefix={<HashIcon size={15} />}
            placeholder="загальне"
            autoFocus
            disabled={remove.isPending}
            onChange={() => setNameError(undefined)}
          />
        </Form.Item>

        {isEditing && (
          <Form.Item label="Категорія" name="categoryId">
            <Select
              allowClear
              disabled={remove.isPending}
              placeholder="Без категорії"
              options={categoryOptions}
            />
          </Form.Item>
        )}
      </Form>
      {channel && (
        <div className={styles.settingsActions}>
          <Popconfirm
            title="Видалити канал?"
            description="Канал і його учасники будуть видалені без можливості відновлення."
            okText="Видалити"
            okButtonProps={{ danger: true, loading: remove.isPending }}
            cancelText="Скасувати"
            onConfirm={() => void handleDelete()}
          >
            <Button type="text" danger loading={remove.isPending} icon={<TrashIcon size={17} />}>
              Видалити канал
            </Button>
          </Popconfirm>
        </div>
      )}
    </Modal>
  );
}
