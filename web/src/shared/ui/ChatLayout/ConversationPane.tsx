import { ArrowLeftIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';
import type { PropsWithChildren, ReactNode } from 'react';

import { IconButton } from '../IconButton';

const useStyles = createStyles(({ token, css }) => ({
  shell: css`
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  `,
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
      padding-inline: 8px;
    }
  `,
  title: css`
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 1;
    min-width: 0;
  `,
  back: css`
    color: ${token.colorText};
  `,
  actions: css`
    display: flex;
    align-items: center;
    gap: 3px;
    flex-shrink: 0;

    @media (max-width: ${token.screenMD}px) {
      gap: 0;
    }
  `,
  divider: css`
    width: 1px;
    height: 22px;
    margin: 0 6px;
    background: ${token.colorBorderSecondary};

    @media (max-width: ${token.screenMD}px) {
      margin-inline: 2px;
    }
  `,
}));

interface ConversationPaneProps extends PropsWithChildren {
  title: ReactNode;
  actions: ReactNode;
  onBack?: () => void;
  backLabel?: string;
}

export function ConversationPane({
  title,
  actions,
  onBack,
  backLabel = 'Назад',
  children,
}: ConversationPaneProps) {
  const { styles } = useStyles();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.title}>
          {onBack && (
            <IconButton size={40} className={styles.back} aria-label={backLabel} onClick={onBack}>
              <ArrowLeftIcon size={20} />
            </IconButton>
          )}
          {title}
        </div>
        <div className={styles.actions}>{actions}</div>
      </header>
      {children}
    </div>
  );
}

export function ConversationActionDivider() {
  const { styles } = useStyles();
  return <span className={styles.divider} aria-hidden />;
}
