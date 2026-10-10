import { Panel, PanelBody, PanelDivider, PanelHeader, useIsMobile } from '@ap-education/ui';
import { createStyles } from 'antd-style';
import { useLocation } from 'react-router-dom';

import { CallHistoryList } from '../../features/calls/components/CallHistoryList/CallHistoryList';
import { ChannelsSidebar } from '../../features/communities/components/ChannelsSidebar';
import { PushSettings } from '../../features/notifications/components/PushSettings';
import { DirectMessageList } from '../../features/social/direct-messages/components/DirectMessageList/DirectMessageList';
import { UnreadDirectMessages } from '../../features/social/direct-messages/components/UnreadDirectMessages/UnreadDirectMessages';
import { WorkspaceHeader } from '../../features/workspaces/components/WorkspaceHeader';
import { useActiveWorkspace } from '../../features/workspaces/hooks/useActiveWorkspace';
import { type ChatsSection, sectionAt } from './sections';

const useStyles = createStyles(({ css }) => ({
  headerActions: css`
    display: flex;
    flex-shrink: 0;
    padding-right: 8px;
  `,
}));

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

function TeamHeader() {
  const { styles } = useStyles();
  const { workspace } = useActiveWorkspace();

  return (
    <>
      <PanelHeader>
        <WorkspaceHeader />
        <div className={styles.headerActions}>
          <PushSettings />
        </div>
      </PanelHeader>
      {workspace && <UnreadDirectMessages />}
      <PanelDivider />
    </>
  );
}

function SectionList({ section }: { section: ChatsSection }) {
  const { workspace } = useActiveWorkspace();

  if (workspace && section === 'direct') return <DirectMessageList workspaceId={workspace.id} />;
  if (workspace && section === 'calls') return <CallHistoryList />;
  return <ChannelsSidebar />;
}
