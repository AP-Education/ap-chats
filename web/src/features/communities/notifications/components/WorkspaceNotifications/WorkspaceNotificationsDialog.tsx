import { useIsMobile } from '@ap-education/ui';
import { Modal } from 'antd';
import { createStyles } from 'antd-style';

import { BottomSheet } from '@/shared/ui/BottomSheet';

import { NotificationsMenu } from '../NotificationsMenu/NotificationsMenu';
import { workspaceSubject } from '../NotificationsMenu/subjects';
import { useWorkspaceNotificationPreference } from './useWorkspaceNotificationPreference';

const useStyles = createStyles(({ token, css }) => ({
  title: css`
    margin: 0 8px 8px;
    font-size: ${token.fontSizeLG}px;
    font-weight: 600;
  `,
  hint: css`
    margin: 0 8px 12px;
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSizeSM}px;
  `,
}));

interface WorkspaceNotificationsDialogProps {
  workspaceId: string;
  open: boolean;
  onClose: () => void;
}

const HINT = 'Канали простору сповіщають так, якщо в каналі не обрано інакше.';

/** What a workspace's channels tell the person about: a dialog beside the panel, a sheet on a phone. */
export function WorkspaceNotificationsDialog({
  workspaceId,
  open,
  onClose,
}: WorkspaceNotificationsDialogProps) {
  const { styles } = useStyles();
  const isMobile = useIsMobile();
  const preference = useWorkspaceNotificationPreference(workspaceId);

  const menu = (
    <>
      <p className={styles.hint}>{HINT}</p>
      <NotificationsMenu subject={workspaceSubject} preference={preference} onDone={onClose} />
    </>
  );

  if (isMobile) {
    return (
      <BottomSheet open={open} onClose={onClose} aria-label={workspaceSubject.label}>
        <h2 className={styles.title}>{workspaceSubject.label}</h2>
        {menu}
      </BottomSheet>
    );
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={320}
      title={workspaceSubject.label}
      destroyOnHidden
    >
      {menu}
    </Modal>
  );
}
