import { Empty, Typography } from 'antd';

export default function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="page">
      <Typography.Title level={2}>{title}</Typography.Title>
      <Empty description={description} />
    </section>
  );
}
