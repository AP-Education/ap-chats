import { Form, message } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { AdaptiveModal } from '@/shared/ui/AdaptiveModal';

import { ChannelAccessEditor } from '../../../channel-access/components/ChannelAccessEditor';
import { openChannelPermissions } from '../../../channel-access/principals';
import type { ChannelPermissionsInput } from '../../../channel-access/types';
import { isChannelNameTaken } from '../../channel-name';
import { useChannelActions } from '../../hooks/useChannelActions';
import type { NewChannelPlace } from '../../stores/channel-dialogs-context';
import { ChannelNameField } from '../ChannelNameField';

interface NewChannelValues {
  name: string;
  permissions: ChannelPermissionsInput;
}

interface CreateChannelModalProps {
  place: NewChannelPlace;
  open: boolean;
  onClose: () => void;
  /** After the exit animation, when the dialog can unmount. */
  onClosed: () => void;
}

export function CreateChannelModal({ place, open, onClose, onClosed }: CreateChannelModalProps) {
  const { t } = useTranslation(['communities', 'common']);
  const [form] = Form.useForm<NewChannelValues>();
  const { create } = useChannelActions(place.workspaceId);
  const navigate = useNavigate();
  const [nameError, setNameError] = useState<string>();

  async function handleFinish(values: NewChannelValues) {
    setNameError(undefined);
    try {
      const created = await create.mutateAsync({
        name: values.name.trim(),
        categoryId: place.categoryId,
        permissions: values.permissions,
      });
      navigate(`/channels/${created.id}`);
      onClose();
    } catch (error) {
      if (isChannelNameTaken(error)) {
        setNameError(t(($) => $.channels.name.taken));
        return;
      }
      void message.error(t(($) => $.channels.createFailed));
    }
  }

  return (
    <AdaptiveModal
      open={open}
      onCancel={onClose}
      afterClose={onClosed}
      onOk={() => form.submit()}
      confirmLoading={create.isPending}
      okText={t(($) => $.common.actions.create)}
      cancelText={t(($) => $.common.actions.cancel)}
      title={t(($) => $.channels.create.title)}
      description={
        place.categoryId
          ? t(($) => $.channels.create.inCategory, { name: place.categoryName })
          : t(($) => $.channels.create.description)
      }
      bodyHeight="min(440px, 62vh)"
      destroyOnHidden
      centered
      width={520}
    >
      <Form<NewChannelValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{ permissions: openChannelPermissions }}
        onFinish={handleFinish}
      >
        <ChannelNameField error={nameError} onEdit={() => setNameError(undefined)} autoFocus />
        <Form.Item label={t(($) => $.access.title)}>
          <Form.Item name="permissions" noStyle>
            <ChannelAccessEditor workspaceId={place.workspaceId} />
          </Form.Item>
        </Form.Item>
      </Form>
    </AdaptiveModal>
  );
}
