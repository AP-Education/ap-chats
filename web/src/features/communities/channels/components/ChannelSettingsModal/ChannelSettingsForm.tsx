import { Form, type FormInstance, Select } from 'antd';
import { createStyles } from 'antd-style';

import { ChannelAccessEditor } from '../../../channel-access/components/ChannelAccessEditor';
import { toPermissionsInput } from '../../../channel-access/principals';
import { useChannelCategories } from '../../../channel-categories/hooks/useChannelCategories';
import type {
  ChannelSettings,
  ChannelSettingsValues,
  LoadedChannelSettings,
} from '../../hooks/useChannelSettings';
import { ChannelNameField } from '../ChannelNameField';
import { DeleteChannelAction } from './DeleteChannelAction';

export type SettingsSection = 'general' | 'access';

const useStyles = createStyles(({ css }) => ({
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
}));

interface ChannelSettingsFormProps {
  form: FormInstance<ChannelSettingsValues>;
  loaded: LoadedChannelSettings;
  settings: ChannelSettings;
  section: SettingsSection;
  onFinish: (values: ChannelSettingsValues) => void;
}

export function ChannelSettingsForm({
  form,
  loaded: { channel, permissions },
  settings,
  section,
  onFinish,
}: ChannelSettingsFormProps) {
  const { styles } = useStyles();
  const { query: categories } = useChannelCategories(channel.workspaceId);
  const { isDeleting } = settings;

  const categoryOptions = (categories.data ?? []).map((category) => ({
    label: category.name,
    value: category.id,
  }));

  return (
    <Form<ChannelSettingsValues>
      form={form}
      className={styles.form}
      layout="vertical"
      requiredMark={false}
      initialValues={{
        name: channel.name,
        categoryId: channel.categoryId ?? undefined,
        permissions: toPermissionsInput(permissions),
      }}
      onFinish={onFinish}
    >
      <div className={styles.pane} hidden={section !== 'general'}>
        <ChannelNameField
          error={settings.nameError}
          onEdit={settings.clearNameError}
          disabled={isDeleting}
        />
        <Form.Item label="Категорія" name="categoryId">
          <Select
            allowClear
            disabled={isDeleting}
            placeholder="Без категорії"
            options={categoryOptions}
          />
        </Form.Item>
        <DeleteChannelAction
          isPending={isDeleting}
          onDelete={() => void settings.deleteChannel()}
        />
      </div>
      <div className={styles.pane} hidden={section !== 'access'}>
        <Form.Item name="permissions" noStyle>
          <ChannelAccessEditor workspaceId={channel.workspaceId} disabled={isDeleting} />
        </Form.Item>
      </div>
    </Form>
  );
}
