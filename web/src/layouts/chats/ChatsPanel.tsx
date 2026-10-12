import { Panel, PanelBody, useIsMobile } from '@ap-education/ui';
import { useLocation } from 'react-router-dom';

import { CallHistoryList } from '../../features/calls/components/CallHistoryList/CallHistoryList';
import { ChannelsSidebar } from '../../features/communities/components/ChannelsSidebar';
import { DirectMessageList } from '../../features/social/direct-messages/components/DirectMessageList/DirectMessageList';
import { useActiveWorkspace } from '../../features/workspaces/hooks/useActiveWorkspace';
import { type ChatsSection, sectionAt } from './sections';
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
        <>
          <PanelBody hidden={section !== 'channels'}>
            <ChannelsSidebar />
          </PanelBody>
          <PanelBody hidden={section !== 'direct'}>
            <SectionList section="direct" />
          </PanelBody>
          <PanelBody hidden={section !== 'calls'}>
            <SectionList section="calls" />
          </PanelBody>
        </>
      ) : (
        <PanelBody>
          <SectionList section={section} />
        </PanelBody>
      )}
    </Panel>
  );
}

function SectionList({ section }: { section: ChatsSection }) {
  const { workspace } = useActiveWorkspace();

  if (workspace && section === 'direct') return <DirectMessageList workspaceId={workspace.id} />;
  if (workspace && section === 'calls') return <CallHistoryList />;
  return <ChannelsSidebar />;
}
