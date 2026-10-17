import { App, Button } from 'antd';
import { useState } from 'react';

import { MuteDurationView } from './MuteDurationView';
import { NotificationLevelsView } from './NotificationLevelsView';
import { NotificationsMenuSkeleton } from './NotificationsMenuSkeleton';
import type { NotificationPreference, NotificationsSubject } from './types';

interface NotificationsMenuProps {
  subject: NotificationsSubject;
  preference: NotificationPreference;
  /** Called once a change is saved, so whatever holds the menu can close. */
  onDone: () => void;
}

/** What a channel or a workspace tells the person about, and for how long it stays silent. */
export function NotificationsMenu({ subject, preference, onDone }: NotificationsMenuProps) {
  const { message } = App.useApp();
  const [view, setView] = useState<'levels' | 'mute'>('levels');

  async function apply(change: () => Promise<unknown>) {
    try {
      await change();
      onDone();
    } catch {
      void message.error(subject.failure);
    }
  }

  if (preference.status === 'loading') return <NotificationsMenuSkeleton />;

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
        title={subject.mute}
        onBack={() => setView('levels')}
        onChooseMute={(duration) => void apply(() => preference.chooseMute(duration))}
        onMuteIndefinitely={() => void apply(() => preference.chooseLevel('none'))}
      />
    );
  }

  return (
    <NotificationLevelsView
      subject={subject}
      level={preference.level}
      isMuted={preference.isMuted}
      onOpenMute={() => setView('mute')}
      onUnmute={() => void apply(preference.unmute)}
      onChooseLevel={(level) => void apply(() => preference.chooseLevel(level))}
    />
  );
}
