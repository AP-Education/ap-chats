import {
  ContentState,
  ContentStateActions,
  ContentStateDescription,
  ContentStateIcon,
  ContentStateTitle,
} from '@ap-education/ui';
import { GearSixIcon, LockIcon } from '@phosphor-icons/react';
import { Button } from 'antd';

interface UnlistedChannelNoticeProps {
  onSettings: () => void;
}

// A workspace manager runs every channel but reads only those whose lists include them.
export function UnlistedChannelNotice({ onSettings }: UnlistedChannelNoticeProps) {
  return (
    <ContentState>
      <ContentStateIcon>
        <LockIcon />
      </ContentStateIcon>
      <ContentStateTitle>Вас немає в списках цього каналу</ContentStateTitle>
      <ContentStateDescription>
        Ви можете змінити його налаштування й доступ. Щоб читати історію, додайте себе до тих, хто
        його бачить.
      </ContentStateDescription>
      <ContentStateActions>
        <Button icon={<GearSixIcon size={18} />} onClick={onSettings}>
          Налаштування каналу
        </Button>
      </ContentStateActions>
    </ContentState>
  );
}
