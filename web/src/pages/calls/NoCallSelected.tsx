import {
  ContentState,
  ContentStateIcon,
  ContentStateTitle,
  Page,
  PageBody,
  PageHeader,
  PageTitle,
  useIsMobile,
} from '@ap-education/ui';
import { PhoneIcon } from '@phosphor-icons/react';

import { MobileMenuButton } from '@/layouts/chats/MobileMenuButton';
import { RefreshOnPull } from '@/shared/ui/PullToRefresh/RefreshOnPull';

/** On mobile the page keeps its header, so the list of calls stays one tap away. */
export default function NoCallSelected() {
  const isMobile = useIsMobile();

  return (
    <Page>
      {isMobile && (
        <PageHeader>
          <MobileMenuButton />
          <PageTitle>Дзвінки</PageTitle>
        </PageHeader>
      )}
      <PageBody>
        <RefreshOnPull>
          <ContentState>
            <ContentStateIcon>
              <PhoneIcon />
            </ContentStateIcon>
            <ContentStateTitle>Оберіть дзвінок, щоб відкрити розмову</ContentStateTitle>
          </ContentState>
        </RefreshOnPull>
      </PageBody>
    </Page>
  );
}
