import { Form, type FormInstance, Input } from 'antd';
import { useState } from 'react';

import { AvatarUploadField } from '../AvatarUploadField';

export interface WorkspaceFormValues {
  name: string;
  avatarPath?: string;
}

interface WorkspaceFormProps {
  form: FormInstance<{ name: string }>;
  initialValues?: WorkspaceFormValues;
  onFinish: (values: WorkspaceFormValues) => void;
}

// Collects a workspace's name + icon and validates them. Knows nothing about
// create vs edit, or how the result gets persisted — that's the modal's job.
export function WorkspaceForm({ form, initialValues, onFinish }: WorkspaceFormProps) {
  const [avatarPath, setAvatarPath] = useState<string | null>(initialValues?.avatarPath ?? null);
  const [nameForFallback, setNameForFallback] = useState(initialValues?.name ?? '');

  function handleFinish(values: { name: string }) {
    onFinish({ name: values.name, avatarPath: avatarPath ?? undefined });
  }

  return (
    <>
      <AvatarUploadField value={avatarPath} onChange={setAvatarPath} alt={nameForFallback} />

      <Form
        form={form}
        layout="vertical"
        initialValues={{ name: initialValues?.name }}
        onFinish={handleFinish}
      >
        <Form.Item
          label="Назва робочого простору"
          name="name"
          rules={[
            { required: true, message: 'Введіть назву' },
            { max: 128, message: 'Максимум 128 символів' },
          ]}
        >
          <Input
            placeholder="Наприклад, AP Education"
            autoFocus
            onChange={(event) => setNameForFallback(event.target.value)}
          />
        </Form.Item>
      </Form>
    </>
  );
}
