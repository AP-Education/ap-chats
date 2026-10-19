import { HashIcon } from '@phosphor-icons/react';
import { Form, Input } from 'antd';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';

const useStyles = createStyles(({ token, css }) => ({
  input: css`
    .ant-input-prefix {
      color: ${token.colorTextTertiary};
      margin-inline-end: 4px;
    }
  `,
}));

interface ChannelNameFieldProps {
  /** The server's refusal of the name, cleared as soon as it is edited. */
  error: string | undefined;
  onEdit: () => void;
  autoFocus?: boolean;
  disabled?: boolean;
}

export function ChannelNameField({ error, onEdit, autoFocus, disabled }: ChannelNameFieldProps) {
  const { t } = useTranslation('communities');
  const { styles } = useStyles();

  return (
    <Form.Item
      label={t(($) => $.channels.name.label)}
      name="name"
      validateStatus={error ? 'error' : undefined}
      help={error}
      rules={[
        { required: true, message: t(($) => $.channels.name.required) },
        { max: 80, message: t(($) => $.channels.name.tooLong) },
      ]}
    >
      <Input
        className={styles.input}
        prefix={<HashIcon size={16} />}
        placeholder={t(($) => $.channels.name.placeholder)}
        autoFocus={autoFocus}
        disabled={disabled}
        onChange={onEdit}
      />
    </Form.Item>
  );
}
