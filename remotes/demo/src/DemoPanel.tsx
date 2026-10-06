import { theme, Typography } from 'antd';

export function DemoPanel() {
  const { token } = theme.useToken();

  return (
    <div style={{ padding: token.paddingMD }}>
      <Typography.Title level={5} style={{ marginTop: 0 }}>
        Демо
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Панель цього застосунку. Рейка застосунків належить shell-у й спільна для всіх.
      </Typography.Paragraph>
    </div>
  );
}
