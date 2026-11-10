import { useTranslation } from 'react-i18next';

import { AdaptiveModal } from '@/shared/ui/AdaptiveModal';

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
  const { t } = useTranslation('communities');

  return (
    <AdaptiveModal
      open={open}
      onCancel={onClose}
      footer={null}
      title={t(($) => $.categories.title)}
      destroyOnHidden
      centered
    >
      <ChannelCategoryList workspaceId={workspaceId} />
      <NewChannelCategoryField workspaceId={workspaceId} />
    </AdaptiveModal>
  );
}
