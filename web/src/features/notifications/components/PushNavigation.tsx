import { type PropsWithChildren, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useCurrentUser } from '@/features/auth/stores/current-user-context';
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace';
import { useActiveWorkspaceId } from '@/features/workspaces/stores/active-workspace-context';
import { isNativeShell, onNativeMessage, postToNative } from '@/shared/lib/nativeBridge';
import { AppLoading } from '@/shared/ui/AppLoading/AppLoading';

import { pushTarget } from '../push-target';
import type { NativeNotificationOpen, NotificationsToNativeMessage } from '../types';

export function PushNavigation({ children }: PropsWithChildren) {
  const user = useCurrentUser();
  const identity = user.status === 'signed-in' ? user.queryIdentity : null;
  const location = useLocation();
  const navigate = useNavigate();
  const { workspaces } = useActiveWorkspace();
  const { activeWorkspaceId, setActiveWorkspaceId } = useActiveWorkspaceId();
  const params = new URLSearchParams(location.search);
  const target = params.get('pushWorkspace');
  const owner = params.get('pushUser');
  const member = workspaces?.some((workspace) => workspace.id === target);

  // A notification route names its workspace and owner: switch to it, or go home if it isn't ours.
  useEffect(() => {
    if (!target || !identity || !workspaces) return;

    if (!member || (owner && owner !== identity)) {
      navigate('/', { replace: true });
      return;
    }

    setActiveWorkspaceId(target);

    const params = new URLSearchParams(location.search);
    params.delete('pushWorkspace');
    params.delete('pushUser');
    const search = params.toString();
    navigate(`${location.pathname}${search ? `?${search}` : ''}`, { replace: true });
  }, [
    target,
    owner,
    identity,
    workspaces,
    member,
    navigate,
    setActiveWorkspaceId,
    location.pathname,
    location.search,
  ]);

  // Browser and native taps both land here; the effect above then checks owner and workspace.
  useEffect(() => {
    function open(url: unknown) {
      const route = pushTarget(url);
      if (route) navigate(route);
    }

    function openFromWorker(event: MessageEvent<{ type?: string; url?: unknown }>) {
      if (event.data?.type === 'notifications/open') open(event.data.url);
    }

    const stopNative = onNativeMessage<NativeNotificationOpen | { type: string }>((message) => {
      if (message.type !== 'notifications/open') return;

      const { eventId, userId, url } = (message as NativeNotificationOpen).payload;
      open(withOwner(url, userId));
      tellNative({ type: 'notifications/ack', eventId });
    });

    navigator.serviceWorker?.addEventListener('message', openFromWorker);
    // The shell holds a tapped notification until this page can route it.
    if (isNativeShell()) tellNative({ type: 'notifications/ready' });

    return () => {
      stopNative();
      navigator.serviceWorker?.removeEventListener('message', openFromWorker);
    };
  }, [navigate]);

  if (target && (!workspaces || (member && activeWorkspaceId !== target))) return <AppLoading />;
  return children;
}

function withOwner(url: string, userId: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}pushUser=${encodeURIComponent(userId)}`;
}

function tellNative(message: NotificationsToNativeMessage): void {
  postToNative(message);
}
