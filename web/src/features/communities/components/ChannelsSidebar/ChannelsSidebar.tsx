import { Button } from 'antd';

import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace';

import { ChannelsList } from './ChannelsList';
import { ChannelsSidebarLoading } from './ChannelsSidebarLoading';

interface ChannelsSidebarProps {
  onNavigate?: () => void;
}

export function ChannelsSidebar({ onNavigate }: ChannelsSidebarProps) {
  const { workspace, isLoading, isError, retry } = useActiveWorkspace();

  if (isLoading) return <ChannelsSidebarLoading />;

  if (isError && !workspace) {
    return (
      <div role="alert" style={{ padding: '12px 16px' }}>
        Не вдалося завантажити робочі простори.{' '}
        <Button type="link" onClick={retry}>
          Повторити
        </Button>
      </div>
    );
  }

  if (!workspace) return null;

  return <ChannelsList key={workspace.id} workspaceId={workspace.id} onNavigate={onNavigate} />;
}
