import { TimelineEntryRetry } from '@ap-education/timeline/react';
import { useTranslation } from 'react-i18next';

import { useUnsentMessages } from '../../sending/stores/unsent-messages-context';

interface UnsentNoticeProps {
  rowId: string;
}

/** Under a message that did not go: try it again, or drop it. */
export const UnsentNotice = ({ rowId }: UnsentNoticeProps) => {
  const { t } = useTranslation('common');
  const { retry, discard } = useUnsentMessages();

  return (
    <TimelineEntryRetry onRetry={() => retry(rowId)}>
      <button type="button" onClick={() => discard(rowId)}>
        {t(($) => $.actions.delete)}
      </button>
    </TimelineEntryRetry>
  );
};
