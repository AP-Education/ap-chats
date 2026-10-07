import { type PropsWithChildren, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { AppLoading } from '@/shared/ui/AppLoading/AppLoading';

import { useCurrentUser } from '../../auth/stores/current-user-context';
import { useActiveWorkspace } from '../../workspaces/hooks/useActiveWorkspace';
import { useActiveWorkspaceId } from '../../workspaces/stores/active-workspace-context';
import { notificationIntent } from './notification-intent';

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

  useEffect(() => {
    if (!target || !identity || !workspaces) return;
    const params = new URLSearchParams(location.search);
    params.delete('pushWorkspace');
    params.delete('pushUser');
    if (!member || (owner && owner !== identity)) {
      navigate('/', { replace: true });
      return;
    }
    setActiveWorkspaceId(target);
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

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    function openFromWorker(event: MessageEvent<{ type?: string; url?: unknown }>) {
      if (event.data?.type !== 'notifications/open' || typeof event.data.url !== 'string') return;

      const target = new URL(event.data.url);
      if (target.origin === window.location.origin) navigate(target.pathname + target.search);
    }

    navigator.serviceWorker.addEventListener('message', openFromWorker);
    return () => navigator.serviceWorker.removeEventListener('message', openFromWorker);
  }, [navigate]);

  useEffect(() => {
    if (!identity) return;
    function open(event: Event) {
      const intent = notificationIntent((event as CustomEvent<unknown>).detail);
      if (!intent) return;
      if (intent.userId === identity) navigate(intent.url);
      window.ReactNativeWebView?.postMessage(
        JSON.stringify({ type: 'notifications/ack', eventId: intent.eventId }),
      );
    }
    window.addEventListener('ap:notification-open', open);
    window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'notifications/ready' }));
    return () => {
      window.removeEventListener('ap:notification-open', open);
      window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'notifications/not-ready' }));
    };
  }, [identity, navigate]);

  if (target && (!workspaces || (member && activeWorkspaceId !== target))) return <AppLoading />;
  return children;
}
