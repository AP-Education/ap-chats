import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace';

import { ChannelsList } from './ChannelsList';
import { ChannelsSidebarLoading } from './ChannelsSidebarLoading';

interface ChannelsSidebarProps {
  onNavigate?: () => void;
}

export function ChannelsSidebar({ onNavigate }: ChannelsSidebarProps) {
  const { t } = useTranslation(['communities', 'common']);
  const { workspace, isLoading, isError, retry } = useActiveWorkspace();

  if (isLoading) return <ChannelsSidebarLoading />;

  if (isError && !workspace) {
    return (
      <div role="alert" style={{ padding: '12px 16px' }}>
        {t(($) => $.sidebar.workspacesLoadFailed)}{' '}
        <Button type="link" onClick={retry}>
          {t(($) => $.common.actions.retry)}
        </Button>
      </div>
    );
  }

  if (!workspace) return null;

  return <ChannelsList key={workspace.id} workspaceId={workspace.id} onNavigate={onNavigate} />;
}
