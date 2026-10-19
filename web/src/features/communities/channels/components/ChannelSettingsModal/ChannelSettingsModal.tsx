import { Form, Skeleton } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AdaptiveModal } from '@/shared/ui/AdaptiveModal';

import { type ChannelSettingsValues, useChannelSettings } from '../../hooks/useChannelSettings';
import { ChannelSettingsForm, type SettingsSection } from './ChannelSettingsForm';

interface ChannelSettingsModalProps {
  workspaceId: string;
  channelId: string;
  open: boolean;
  onClose: () => void;
  /** After the exit animation, when the dialog can unmount. */
  onClosed: () => void;
}

export function ChannelSettingsModal({
  workspaceId,
  channelId,
  open,
  onClose,
  onClosed,
}: ChannelSettingsModalProps) {
  const { t } = useTranslation(['communities', 'common']);
  const [form] = Form.useForm<ChannelSettingsValues>();
  const [section, setSection] = useState<SettingsSection>('general');
  const settings = useChannelSettings(workspaceId, channelId, onClose);
  const { loaded, isDeleting } = settings;
  const sections: { key: SettingsSection; label: string }[] = [
    { key: 'general', label: t(($) => $.channels.settingsTabs.general) },
    { key: 'access', label: t(($) => $.access.title) },
  ];

  function save(values: ChannelSettingsValues) {
    void settings.save(values, {
      details: form.isFieldsTouched(['name', 'categoryId']),
      access: form.isFieldTouched('permissions'),
    });
  }

  return (
    <AdaptiveModal
      open={open}
      onCancel={onClose}
      afterClose={onClosed}
      onOk={() => form.submit()}
      confirmLoading={settings.isSaving}
      okButtonProps={{ disabled: !loaded || isDeleting }}
      okText={t(($) => $.common.actions.save)}
      cancelText={t(($) => $.common.actions.cancel)}
      title={t(($) => $.channels.settings)}
      description={t(($) => $.channels.settingsDescription)}
      tabs={{ items: sections, activeKey: section, onChange: setSection }}
      bodyHeight="min(440px, 62vh)"
      destroyOnHidden
      centered
      width={520}
    >
      {loaded ? (
        <ChannelSettingsForm
          form={form}
          loaded={loaded}
          settings={settings}
          section={section}
          onFinish={save}
        />
      ) : (
        <Skeleton active paragraph={{ rows: 5 }} />
      )}
    </AdaptiveModal>
  );
}
