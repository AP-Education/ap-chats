import { IconButton } from '@ap/ui';
import { XIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';
import type { ReactNode } from 'react';

const useStyles = createStyles(({ token, css }) => ({
  header: css`
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 60px;
    padding: 0 20px;
    border-bottom: 1px solid ${token.colorBorderSecondary};

    @media (max-width: ${token.screenMD}px) {
      min-height: 56px;
      gap: 4px;
      padding-inline: 16px;
    }
  `,
  title: css`
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
    color: ${token.colorText};
    font-size: ${token.fontSizeLG}px;
    font-weight: 650;
  `,
  close: css`
    flex-shrink: 0;
    color: ${token.colorTextSecondary};
  `,
}));

interface ChatPanelHeaderProps {
  title: ReactNode;
  closeLabel: string;
  onClose: () => void;
}

export function ChatPanelHeader({ title, closeLabel, onClose }: ChatPanelHeaderProps) {
  const { styles } = useStyles();

  return (
    <header className={styles.header}>
      <div className={styles.title}>{title}</div>
      <IconButton size={36} className={styles.close} aria-label={closeLabel} onClick={onClose}>
        <XIcon size={18} />
      </IconButton>
    </header>
  );
}
