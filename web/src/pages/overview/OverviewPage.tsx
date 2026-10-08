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

import { MobileMenuButton } from '@/layouts/chats/MobileMenuButton';

export default function OverviewPage() {
  return (
    <Page>
      <PageHeader>
        <MobileMenuButton />
        <PageTitle>Головна</PageTitle>
      </PageHeader>
      <PageBody>
        <ContentState>
          <ContentStateIcon>
            <ChatsCircleIcon />
          </ContentStateIcon>
          <ContentStateTitle>Розмов поки немає</ContentStateTitle>
        </ContentState>
      </PageBody>
    </Page>
  );
}
