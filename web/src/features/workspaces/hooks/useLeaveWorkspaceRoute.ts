import { useIsAppActive } from '@ap-education/shell-sdk';
import { useLocation, useNavigate } from 'react-router-dom';

// A channel or conversation route belongs to the workspace that was open; section roots fit any.
export function useLeaveWorkspaceRoute(): () => void {
  const chatsActive = useIsAppActive();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return () => {
    if (!chatsActive) return;
    if (pathname.startsWith('/channels/')) void navigate('/channels', { replace: true });
    if (pathname.startsWith('/direct/')) void navigate('/direct', { replace: true });
  };
}
