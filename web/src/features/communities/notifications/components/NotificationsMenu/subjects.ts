import type { TFunction } from 'i18next';

import type { NotificationSettings } from '../../types';
import type { NotificationsSubject } from './types';

export function workspaceSubject(t: TFunction<'communities'>): NotificationsSubject {
  return {
    label: t(($) => $.notifications.workspace.title),
    mute: t(($) => $.notifications.workspace.mute),
    unmute: t(($) => $.notifications.workspace.unmute),
    failure: t(($) => $.notifications.workspace.updateFailed),
    levels: [
      { value: 'all', title: t(($) => $.notifications.levels.all) },
      {
        value: 'mentions',
        title: t(($) => $.notifications.levels.mentions),
        description: t(($) => $.notifications.levels.default),
      },
    ],
  };
}

/** A channel left at its default follows the workspace, so the default says what that means now. */
export function channelSubject(
  workspace: NotificationSettings | undefined,
  t: TFunction<'communities'>,
): NotificationsSubject {
  return {
    label: t(($) => $.notifications.title),
    mute: t(($) => $.notifications.mute),
    unmute: t(($) => $.notifications.unmute),
    failure: t(($) => $.notifications.updateFailed),
    levels: [
      {
        value: 'default',
        title: t(($) => $.notifications.levels.followWorkspace),
        description: workspaceDefault(workspace, t),
      },
      { value: 'all', title: t(($) => $.notifications.levels.all) },
      { value: 'mentions', title: t(($) => $.notifications.levels.mentions) },
      { value: 'none', title: t(($) => $.notifications.levels.none) },
    ],
  };
}

function workspaceDefault(
  workspace: NotificationSettings | undefined,
  t: TFunction<'communities'>,
): string {
  if (workspace?.isMuted) return t(($) => $.notifications.levels.workspaceMuted);
  return workspace?.level === 'all'
    ? t(($) => $.notifications.levels.all)
    : t(($) => $.notifications.levels.mentions);
}
