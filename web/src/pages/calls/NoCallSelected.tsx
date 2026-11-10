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
import { useTranslation } from 'react-i18next';

import { MobileMenuButton } from '@/layouts/chats/MobileMenuButton';
import { RefreshOnPull } from '@/shared/ui/PullToRefresh/RefreshOnPull';

/** On mobile the page keeps its header, so the list of calls stays one tap away. */
export default function NoCallSelected() {
  const { t } = useTranslation('calls');
  const isMobile = useIsMobile();

  return (
    <Page>
      {isMobile && (
        <PageHeader>
          <MobileMenuButton />
          <PageTitle>{t(($) => $.title)}</PageTitle>
        </PageHeader>
      )}
      <PageBody>
        <RefreshOnPull>
          <ContentState>
            <ContentStateIcon>
              <PhoneIcon />
            </ContentStateIcon>
            <ContentStateTitle>{t(($) => $.selectCall)}</ContentStateTitle>
          </ContentState>
        </RefreshOnPull>
      </PageBody>
    </Page>
  );
}
