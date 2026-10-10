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
        <ContentState>
          <ContentStateIcon>
            <PhoneIcon />
          </ContentStateIcon>
          <ContentStateTitle>Оберіть дзвінок, щоб відкрити розмову</ContentStateTitle>
        </ContentState>
      </PageBody>
    </Page>
  );
}
