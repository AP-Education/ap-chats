import { useIsMobile } from '@ap-education/ui';
import { createStyles } from 'antd-style';

import { AdaptiveModal } from '@/shared/ui/AdaptiveModal';
import { BottomSheet } from '@/shared/ui/BottomSheet';

import { NotificationsMenu } from '../NotificationsMenu/NotificationsMenu';
import { workspaceSubject } from '../NotificationsMenu/subjects';
import { useWorkspaceNotificationPreference } from './useWorkspaceNotificationPreference';

// One height for both views of the menu, so switching to the mute durations never jumps.
const SHEET_HEIGHT = 'min(420px, 60dvh)';

const HINT = 'Канали простору сповіщають так, якщо в каналі не обрано інакше.';

// Headings sit on the rows' own inset, so the text of every line starts at one edge.
const useStyles = createStyles(({ token, css }) => ({
  title: css`
    margin: 0 12px;
    font-size: ${token.fontSizeLG}px;
    font-weight: 600;
  `,
  summary: css`
    margin: 2px 12px 12px;
    color: ${token.colorTextSecondary};
  `,
  menu: css`
    margin: -8px -12px;
  `,
}));

interface WorkspaceNotificationsDialogProps {
  workspaceId: string;
  open: boolean;
  onClose: () => void;
}

/** What a workspace's channels tell the person about: a sheet on a phone, a dialog elsewhere. */
export function WorkspaceNotificationsDialog({
  workspaceId,
  open,
  onClose,
}: WorkspaceNotificationsDialogProps) {
  const { styles } = useStyles();
  const isMobile = useIsMobile();
  const preference = useWorkspaceNotificationPreference(workspaceId);

  const menu = (
    <NotificationsMenu
      subject={workspaceSubject}
      preference={preference}
      size="large"
      onDone={onClose}
    />
  );

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onClose={onClose}
        height={SHEET_HEIGHT}
        aria-label={workspaceSubject.label}
      >
        <h2 className={styles.title}>{workspaceSubject.label}</h2>
        <p className={styles.summary}>{HINT}</p>
        {menu}
      </BottomSheet>
    );
  }

  return (
    <AdaptiveModal
      open={open}
      centered
      destroyOnHidden
      width={400}
      title={workspaceSubject.label}
      description={HINT}
      footer={null}
      onCancel={onClose}
    >
      <div className={styles.menu}>{menu}</div>
    </AdaptiveModal>
  );
}
