import { Empty, Typography } from 'antd';

export default function OverviewPage() {
  return (
    <section className="page">
      <Typography.Title level={2}>Розмови</Typography.Title>
      <Empty description="Розмов поки немає" />
    </section>
  );
}
