import { useIsMobile } from '@ap-education/ui';
import { BottomSheet } from '@ap-education/ui/sheet';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';

import { AdaptiveModal } from '@/shared/ui/AdaptiveModal';

import { NotificationsMenu } from '../NotificationsMenu/NotificationsMenu';
import { workspaceSubject } from '../NotificationsMenu/subjects';
import { useWorkspaceNotificationPreference } from './useWorkspaceNotificationPreference';

// One height for both views of the menu, so switching to the mute durations never jumps.
const SHEET_HEIGHT = 'min(420px, 60dvh)';

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
  const { t } = useTranslation('communities');
  const subject = workspaceSubject(t);
  const hint = t(($) => $.notifications.workspace.hint);
  const isMobile = useIsMobile();
  const preference = useWorkspaceNotificationPreference(workspaceId);

  const menu = (
    <NotificationsMenu subject={subject} preference={preference} size="large" onDone={onClose} />
  );

  if (isMobile) {
    return (
      <BottomSheet open={open} onClose={onClose} height={SHEET_HEIGHT} aria-label={subject.label}>
        <h2 className={styles.title}>{subject.label}</h2>
        <p className={styles.summary}>{hint}</p>
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
      title={subject.label}
      description={hint}
      footer={null}
      onCancel={onClose}
    >
      <div className={styles.menu}>{menu}</div>
    </AdaptiveModal>
  );
}
