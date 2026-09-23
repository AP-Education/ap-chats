import { Empty, Typography } from 'antd';

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div style={{ maxWidth: 900 }}>
      <Typography.Title level={2}>{title}</Typography.Title>
      <Empty description="Цей розділ з’явиться під час реалізації MVP" />
    </div>
  );
}
