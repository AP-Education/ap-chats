import { HashIcon } from '@phosphor-icons/react';
import { Form, Input } from 'antd';
import { createStyles } from 'antd-style';

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
  const { styles } = useStyles();

  return (
    <Form.Item
      label="Назва каналу"
      name="name"
      validateStatus={error ? 'error' : undefined}
      help={error}
      rules={[
        { required: true, message: 'Введіть назву' },
        { max: 80, message: 'Максимум 80 символів' },
      ]}
    >
      <Input
        className={styles.input}
        prefix={<HashIcon size={16} />}
        placeholder="загальне"
        autoFocus={autoFocus}
        disabled={disabled}
        onChange={onEdit}
      />
    </Form.Item>
  );
}
