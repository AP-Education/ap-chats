import { Modal } from 'antd';

import { ChannelCategoryList } from './ChannelCategoryList';
import { NewChannelCategoryField } from './NewChannelCategoryField';

interface ChannelCategoriesModalProps {
  workspaceId: string;
  open: boolean;
  onClose: () => void;
}

// Owner-only taxonomy management: rename/delete existing categories, add new
// ones. Position isn't exposed here — the API list is already sorted, and
// manual reordering isn't part of this increment.
export function ChannelCategoriesModal({
  workspaceId,
  open,
  onClose,
}: ChannelCategoriesModalProps) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title="Категорії каналів"
      destroyOnHidden
      centered
    >
      <ChannelCategoryList workspaceId={workspaceId} />
      <NewChannelCategoryField workspaceId={workspaceId} />
    </Modal>
  );
}
