import { Panel, PanelBody, useIsMobile } from '@ap-education/ui';
import { useLocation } from 'react-router-dom';

import { RefreshablePanelBody } from './RefreshablePanelBody';
import { SectionList } from './SectionList';
import { chatsSections, sectionAt } from './sections';
import { TeamHeader } from './TeamHeader';

/** The list of the page's section: the team's channels, direct messages or calls. */
export function ChatsPanel() {
  const { pathname } = useLocation();
  const isMobile = useIsMobile();
  const section = sectionAt(pathname);

  return (
    <Panel>
      {section === 'channels' && <TeamHeader />}
      {isMobile ? (
        chatsSections.map((each) => (
          <RefreshablePanelBody key={each} hidden={each !== section}>
            <SectionList section={each} />
          </RefreshablePanelBody>
        ))
      ) : (
        <PanelBody>
          <SectionList section={section} />
        </PanelBody>
      )}
    </Panel>
  );
}
