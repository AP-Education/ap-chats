import type { NotificationLevel } from '../../types';
import { MuteDurationView } from './MuteDurationView';
import { NotificationLevelsView } from './NotificationLevelsView';

interface NotificationPopoverContentProps {
  view: 'levels' | 'mute';
  level: NotificationLevel;
  isMuted: boolean;
  onBack: () => void;
  onOpenMute: () => void;
  onUnmute: () => void;
  onChooseLevel: (level: NotificationLevel) => void;
  onChooseMute: (milliseconds: number) => void;
}

export function NotificationPopoverContent({
  view,
  level,
  isMuted,
  onBack,
  onOpenMute,
  onUnmute,
  onChooseLevel,
  onChooseMute,
}: NotificationPopoverContentProps) {
  if (view === 'mute') {
    return (
      <MuteDurationView
        onBack={onBack}
        onChooseMute={onChooseMute}
        onMuteIndefinitely={() => onChooseLevel('none')}
      />
    );
  }

  return (
    <NotificationLevelsView
      level={level}
      isMuted={isMuted}
      onOpenMute={onOpenMute}
      onUnmute={onUnmute}
      onChooseLevel={onChooseLevel}
    />
  );
}
