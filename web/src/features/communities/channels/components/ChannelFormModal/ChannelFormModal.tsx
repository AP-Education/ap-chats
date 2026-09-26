import { ArchiveIcon, ArrowCounterClockwiseIcon, HashIcon } from '@phosphor-icons/react';
import { Button, Form, Input, message, Modal, Popconfirm, Select, Typography } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ApiError } from '@/shared/api/http';

import { useChannelCategories } from '../../../channel-categories/hooks/useChannelCategories';
import { useChannelActions } from '../../hooks/useChannelActions';
import type { Channel, ChannelKind } from '../../types';
import { ChannelKindPicker } from './ChannelKindPicker';

const useStyles = createStyles(({ token, css }) => ({
  header: css`
    margin-bottom: ${token.marginLG}px;
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
  const { create, update, setArchived } = useChannelActions(workspaceId);
  const navigate = useNavigate();
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

  function handleArchive() {
    if (!channel) return;
    setArchived.mutate(
      { channelId: channel.id, archived: !channel.archivedAt },
      {
        onSuccess: handleClose,
        onError: () => message.error('Не вдалося змінити статус каналу.'),
      },
    );
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
      throw error;
    }
  }

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      onOk={() => form.submit()}
      confirmLoading={isPending}
      okButtonProps={{ disabled: Boolean(channel?.archivedAt) }}
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
          {channel?.archivedAt
            ? 'Розархівуйте канал, щоб змінити назву чи категорію.'
            : isEditing
              ? 'Назва, категорія та доступність каналу'
              : `у категорії «${categoryName}»`}
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
            disabled={Boolean(channel?.archivedAt)}
            onChange={() => setNameError(undefined)}
          />
        </Form.Item>

        {isEditing && (
          <Form.Item label="Категорія" name="categoryId">
            <Select
              allowClear
              disabled={Boolean(channel?.archivedAt)}
              placeholder="Без категорії"
              options={categoryOptions}
            />
          </Form.Item>
        )}
      </Form>
      {channel && (
        <div className={styles.settingsActions}>
          <Popconfirm
            title={channel.archivedAt ? 'Розархівувати канал?' : 'Архівувати канал?'}
            description={
              channel.archivedAt
                ? 'Учасники знову зможуть користуватися каналом.'
                : 'Канал залишиться у списку, але надсилання повідомлень буде недоступним.'
            }
            okText={channel.archivedAt ? 'Розархівувати' : 'Архівувати'}
            cancelText="Скасувати"
            onConfirm={handleArchive}
          >
            <Button
              type="text"
              danger={!channel.archivedAt}
              loading={setArchived.isPending}
              icon={
                channel.archivedAt ? (
                  <ArrowCounterClockwiseIcon size={17} />
                ) : (
                  <ArchiveIcon size={17} />
                )
              }
            >
              {channel.archivedAt ? 'Розархівувати канал' : 'Архівувати канал'}
            </Button>
          </Popconfirm>
        </div>
      )}
    </Modal>
  );
}
