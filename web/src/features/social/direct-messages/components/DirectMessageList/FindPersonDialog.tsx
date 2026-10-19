import { Modal } from 'antd';

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
  function opened() {
    onClose();
    onNavigate?.();
  }

  return (
    <Modal title="Написати колезі" open={open} onCancel={onClose} footer={null} destroyOnHidden>
      <FindPersonSearch workspaceId={workspaceId} onOpened={opened} />
    </Modal>
  );
}
