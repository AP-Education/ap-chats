import {
  ContentState,
  ContentStateActions,
  ContentStateDescription,
  ContentStateIcon,
  ContentStateTitle,
} from '@ap-education/ui';
import { GearSixIcon, LockIcon } from '@phosphor-icons/react';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

interface UnlistedChannelNoticeProps {
  onSettings: () => void;
}

// A workspace manager runs every channel but reads only those whose lists include them.
export function UnlistedChannelNotice({ onSettings }: UnlistedChannelNoticeProps) {
  const { t } = useTranslation('communities');

  return (
    <ContentState>
      <ContentStateIcon>
        <LockIcon />
      </ContentStateIcon>
      <ContentStateTitle>{t(($) => $.channels.unlisted.title)}</ContentStateTitle>
      <ContentStateDescription>{t(($) => $.channels.unlisted.description)}</ContentStateDescription>
      <ContentStateActions>
        <Button icon={<GearSixIcon size={18} />} onClick={onSettings}>
          {t(($) => $.channels.settings)}
        </Button>
      </ContentStateActions>
    </ContentState>
  );
}
