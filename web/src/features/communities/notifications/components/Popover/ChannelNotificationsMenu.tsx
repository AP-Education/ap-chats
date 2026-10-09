import { App, Button } from 'antd';
import { useState } from 'react';

import { ChannelNotificationsMenuSkeleton } from './ChannelNotificationsMenuSkeleton';
import { MuteDurationView } from './MuteDurationView';
import { NotificationLevelsView } from './NotificationLevelsView';
import type { ChannelNotificationPreference } from './useChannelNotificationPreference';

interface ChannelNotificationsMenuProps {
  preference: ChannelNotificationPreference;
  /** Called once a change is saved, so the popover can close. */
  onDone: () => void;
}

export function ChannelNotificationsMenu({ preference, onDone }: ChannelNotificationsMenuProps) {
  const { message } = App.useApp();
  const [view, setView] = useState<'levels' | 'mute'>('levels');

  async function apply(change: () => Promise<unknown>) {
    try {
      await change();
      onDone();
    } catch {
      void message.error('Не вдалося оновити сповіщення каналу.');
    }
  }

  if (preference.status === 'loading') return <ChannelNotificationsMenuSkeleton />;

  if (preference.status === 'failed') {
    return (
      <Button type="link" onClick={preference.retry}>
        Повторити завантаження
      </Button>
    );
  }

  if (view === 'mute') {
    return (
      <MuteDurationView
        onBack={() => setView('levels')}
        onChooseMute={(milliseconds) => void apply(() => preference.chooseMute(milliseconds))}
        onMuteIndefinitely={() => void apply(() => preference.chooseLevel('none'))}
      />
    );
  }

  return (
    <NotificationLevelsView
      level={preference.level}
      isMuted={preference.isMuted}
      onOpenMute={() => setView('mute')}
      onUnmute={() => void apply(preference.unmute)}
      onChooseLevel={(level) => void apply(() => preference.chooseLevel(level))}
    />
  );
}
