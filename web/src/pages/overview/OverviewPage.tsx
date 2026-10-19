import {
  ContentState,
  ContentStateIcon,
  ContentStateTitle,
  Page,
  PageBody,
  PageHeader,
  PageTitle,
} from '@ap-education/ui';
import { ChatsCircleIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

import { MobileMenuButton } from '@/layouts/chats/MobileMenuButton';
import { RefreshOnPull } from '@/shared/ui/PullToRefresh/RefreshOnPull';

export default function OverviewPage() {
  const { t } = useTranslation('navigation');

  return (
    <Page>
      <PageHeader>
        <MobileMenuButton />
        <PageTitle>{t(($) => $.home)}</PageTitle>
      </PageHeader>
      <PageBody>
        <RefreshOnPull>
          <ContentState>
            <ContentStateIcon>
              <ChatsCircleIcon />
            </ContentStateIcon>
            <ContentStateTitle>{t(($) => $.noConversations)}</ContentStateTitle>
          </ContentState>
        </RefreshOnPull>
      </PageBody>
    </Page>
  );
}
