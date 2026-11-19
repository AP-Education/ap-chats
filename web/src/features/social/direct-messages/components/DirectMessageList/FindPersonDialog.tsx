import { Modal } from 'antd';
import { useTranslation } from 'react-i18next';

import { FindPersonSearch } from './FindPersonSearch';

interface FindPersonDialogProps {
  workspaceId: string;
  open: boolean;
  onClose: () => void;
  onNavigate?: () => void;
}

// The search lives inside the dialog, so it starts empty each time the dialog opens.
export function FindPersonDialog({
  workspaceId,
  open,
  onClose,
  onNavigate,
}: FindPersonDialogProps) {
  const { t } = useTranslation('directMessages');

  function opened() {
    onClose();
    onNavigate?.();
  }

  return (
    <Modal
      title={t(($) => $.findPerson.title)}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      <FindPersonSearch workspaceId={workspaceId} onOpened={opened} />
    </Modal>
  );
}
