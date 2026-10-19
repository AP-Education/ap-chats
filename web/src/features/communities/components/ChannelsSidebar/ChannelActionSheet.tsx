import { GearSixIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';

import { BottomSheet } from '@/shared/ui/BottomSheet';

import type { Channel } from '../../channels/types';

const useStyles = createStyles(({ token, css }) => ({
  action: css`
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    min-height: 48px;
    padding: 8px 12px;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: ${token.colorText};
    font: inherit;
    text-align: left;

    &:active {
      background: ${token.colorFillTertiary};
    }
  `,
  heading: css`
    margin: 4px 12px 8px;
    color: ${token.colorText};
    font-weight: 650;
  `,
}));

interface ChannelActionSheetProps {
  open: boolean;
  channel: Channel;
  onClose: () => void;
  onSettings: () => void;
}

export function ChannelActionSheet({
  open,
  channel,
  onClose,
  onSettings,
}: ChannelActionSheetProps) {
  const { t } = useTranslation('communities');
  const { styles } = useStyles();

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      aria-label={t(($) => $.channels.actionsOf, { name: channel.name })}
    >
      <div className={styles.heading}>{channel.name}</div>
      <button
        type="button"
        className={styles.action}
        onClick={() => {
          onClose();
          onSettings();
        }}
      >
        <GearSixIcon size={20} />
        {t(($) => $.channels.settings)}
      </button>
    </BottomSheet>
  );
}
