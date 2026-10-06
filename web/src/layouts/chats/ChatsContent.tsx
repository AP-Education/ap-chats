import { useIsMobile } from '@ap/shell-ui';
import { Skeleton, theme } from 'antd';
import { Suspense } from 'react';
import { useLocation, useRoutes } from 'react-router-dom';

import { ChatLoading } from '@/domain/conversation/ChatLoading';

import { chatsRoutes } from '../../app/routes';
import { PageSection } from '../../shared/ui/PageSection/PageSection';

export function ChatsContent() {
  const { token } = theme.useToken();
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  const routes = useRoutes(chatsRoutes);
  const isChatPage = pathname.startsWith('/channels') || pathname.startsWith('/direct');
  const isEdgeToEdge = isChatPage || pathname.startsWith('/calls') || pathname === '/';

  return (
    <div style={{ height: '100%', padding: isMobile || isEdgeToEdge ? 0 : token.paddingXS }}>
      <PageSection
        maxWidth={isEdgeToEdge ? 'none' : 1920}
        style={isEdgeToEdge ? { padding: 0, borderRadius: 0 } : undefined}
      >
        <Suspense
          fallback={
            isChatPage ? (
              <ChatLoading />
            ) : (
              <div role="status" aria-label="Завантажуємо сторінку" style={{ padding: 24 }}>
                <Skeleton active paragraph={{ rows: 4 }} />
              </div>
            )
          }
        >
          {routes}
        </Suspense>
      </PageSection>
    </div>
  );
}
