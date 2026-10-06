import { MobileMenuButton } from '@ap/shell-ui';
import { RocketLaunchIcon } from '@phosphor-icons/react';
import { Button, Card, Space, theme, Typography } from 'antd';
import { useState } from 'react';

export function DemoContent() {
  const { token } = theme.useToken();
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: token.paddingLG, maxWidth: 720 }}>
      <MobileMenuButton />
      <Card>
        <Space orientation="vertical" size="middle">
          <Space>
            <RocketLaunchIcon size={24} color={token.colorPrimary} />
            <Typography.Title level={4} style={{ margin: 0 }}>
              Окремий мікрофронтенд
            </Typography.Title>
          </Space>
          <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
            Цей екран зібрано й розгорнуто окремо від AP Chats. Бічна панель належить shell-у й не
            перемонтовується при переході між застосунками.
          </Typography.Paragraph>
          <Button type="primary" onClick={() => setCount((value) => value + 1)}>
            Натиснуто: {count}
          </Button>
        </Space>
      </Card>
    </div>
  );
}
