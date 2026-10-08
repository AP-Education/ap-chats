import {
  isNativeShell,
  onNativeMessage,
  postToNative,
  useCurrentUser,
} from '@ap-education/shell-sdk';
import { type PropsWithChildren, useEffect, useEffectEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace';
import { useActiveWorkspaceId } from '@/features/workspaces/stores/active-workspace-context';

import { notificationRoute } from '../notification-route';
import type {
  NativeNotificationOpen,
  NotificationsToNativeMessage,
  NotificationTap,
} from '../types';

// The service worker starts the app here when a tap finds no open window.
const LAUNCH_PARAM = 'notification';

/** Opens what a tapped notification points at, from the service worker or the native shell. */
export function PushNavigation({ children }: PropsWithChildren) {
  const user = useCurrentUser();
  const identity = user.status === 'signed-in' ? user.queryIdentity : null;
  const location = useLocation();
  const navigate = useNavigate();
  const { workspaces } = useActiveWorkspace();
  const { setActiveWorkspaceId } = useActiveWorkspaceId();
  const launch = new URLSearchParams(location.search).get(LAUNCH_PARAM);
  const ready = Boolean(identity && workspaces);

  // Only for the account and a workspace it was meant for; any other tap goes nowhere.
  const open = useEffectEvent((tap: NotificationTap, replace = false): boolean => {
    const route = notificationRoute(tap.target);
    const isOurs =
      tap.userId === identity && workspaces?.some(({ id }) => id === route?.workspaceId);
    if (!route || !isOurs) return false;

    setActiveWorkspaceId(route.workspaceId);
    navigate(route.path, { replace });
    return true;
  });

  useEffect(() => {
    if (!launch || !ready) return;

    if (!open(parseTap(launch), true)) navigate('/', { replace: true });
  }, [launch, ready, navigate]);

  useEffect(() => {
    if (!ready) return;

    function openFromWorker(event: MessageEvent<{ type?: string } & NotificationTap>) {
      if (event.data?.type === 'notifications/open') open(event.data);
    }

    const stopNative = onNativeMessage<NativeNotificationOpen | { type: string }>((message) => {
      if (message.type !== 'notifications/open') return;

      const { eventId, ...tap } = (message as NativeNotificationOpen).payload;
      open(tap);
      tellNative({ type: 'notifications/ack', eventId });
    });

    navigator.serviceWorker?.addEventListener('message', openFromWorker);
    // The shell holds a tapped notification until this page can route it.
    if (isNativeShell()) tellNative({ type: 'notifications/ready' });

    return () => {
      stopNative();
      navigator.serviceWorker?.removeEventListener('message', openFromWorker);
    };
  }, [ready]);

  // The shell frame stays up while the tap is routed.
  if (launch) return null;
  return children;
}

function parseTap(launch: string): NotificationTap {
  try {
    return JSON.parse(launch) as NotificationTap;
  } catch {
    return { userId: null, target: null };
  }
}

function tellNative(message: NotificationsToNativeMessage): void {
  postToNative(message);
}
