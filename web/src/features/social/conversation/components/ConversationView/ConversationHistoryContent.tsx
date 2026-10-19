import { Alert, Button } from 'antd';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';

import type { useMessageOperations } from '@/features/social/messaging/hooks/useMessageOperations';

import { ConversationTimeline } from './ConversationTimeline';
import type { useConversationActions } from './useConversationActions';
import type { useConversationHistoryNavigation } from './useConversationHistoryNavigation';

const useStyles = createStyles(({ css }) => ({
  center: css`
    display: grid;
    place-content: center;
    flex: 1;
    padding: 20px;
  `,
}));

interface ConversationHistoryContentProps {
  navigation: ReturnType<typeof useConversationHistoryNavigation>;
  interaction: ReturnType<typeof useConversationActions>;
  operations: ReturnType<typeof useMessageOperations>;
}

export function ConversationHistoryContent({
  navigation,
  interaction,
  operations,
}: ConversationHistoryContentProps) {
  const { styles } = useStyles();
  const { t } = useTranslation(['conversation', 'common']);
  const { history } = navigation;

  // The wallpaper alone until the history lands, which then appears at once.
  if (history.isPending) return null;

  if (history.isError && !history.data)
    return (
      <div className={styles.center}>
        <Alert
          type="error"
          showIcon
          message={t(($) => $.historyLoadFailed)}
          action={
            <Button onClick={() => void history.refetch()}>
              {t(($) => $.common.actions.retry)}
            </Button>
          }
        />
      </div>
    );

  return (
    <ConversationTimeline
      navigation={navigation}
      interaction={interaction}
      operations={operations}
    />
  );
}
