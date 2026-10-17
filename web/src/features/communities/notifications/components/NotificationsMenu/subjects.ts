import type { NotificationSettings } from '../../types';
import type { NotificationsSubject } from './types';

const ALL = 'Усі повідомлення';
const MENTIONS = 'Лише згадки';

export const workspaceSubject: NotificationsSubject = {
  label: 'Сповіщення простору',
  mute: 'Вимкнути простір',
  unmute: 'Увімкнути простір',
  failure: 'Не вдалося оновити сповіщення простору.',
  levels: [
    { value: 'all', title: ALL },
    { value: 'mentions', title: MENTIONS, description: 'За замовчуванням' },
  ],
};

/** A channel left at its default follows the workspace, so the default says what that means now. */
export function channelSubject(workspace: NotificationSettings | undefined): NotificationsSubject {
  return {
    label: 'Сповіщення каналу',
    mute: 'Вимкнути канал',
    unmute: 'Увімкнути канал',
    failure: 'Не вдалося оновити сповіщення каналу.',
    levels: [
      { value: 'default', title: 'Як у просторі', description: workspaceDefault(workspace) },
      { value: 'all', title: ALL },
      { value: 'mentions', title: MENTIONS },
      { value: 'none', title: 'Жодних' },
    ],
  };
}

function workspaceDefault(workspace: NotificationSettings | undefined): string {
  if (workspace?.isMuted) return 'Простір вимкнено';
  return workspace?.level === 'all' ? ALL : MENTIONS;
}
