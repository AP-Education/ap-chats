import { Alert, Card, Col, Row, Space, Typography } from 'antd';

export default function OverviewPage() {
  return (
    <div style={{ maxWidth: 1000 }}>
      <Typography.Title level={2}>Розмови команди в одному місці</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ fontSize: 16, maxWidth: 680 }}>
        AP Connect об’єднає канали, особисті повідомлення й дзвінки зі спільним входом AP. Мета
        першої версії — перенести щоденне спілкування команди з Discord.
      </Typography.Paragraph>
      <Alert
        type="info"
        showIcon
        title="Scaffold застосунку"
        description="Навігація та вигляд готові для наступного етапу. Чати, вхід і дзвінки поки не працюють."
        style={{ margin: '24px 0' }}
      />
      <Row gutter={[16, 16]}>
        {[
          ['Канали', 'Теми й команди з історією обговорень.'],
          ['Особисті повідомлення', 'Швидка розмова з колегами.'],
          ['Дзвінки', 'Зустрічі з підключенням LiveKit.'],
        ].map(([title, description]) => (
          <Col xs={24} md={8} key={title}>
            <Card style={{ height: '100%' }}>
              <Space direction="vertical">
                <Typography.Text strong>{title}</Typography.Text>
                <Typography.Text type="secondary">{description}</Typography.Text>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
