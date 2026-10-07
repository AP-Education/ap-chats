import { Alert, Button, Spin } from 'antd';
import { createStyles } from 'antd-style';

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
  const { history } = navigation;

  if (history.isPending)
    return (
      <div className={styles.center}>
        <Spin size="large" />
      </div>
    );

  if (history.isError && !history.data)
    return (
      <div className={styles.center}>
        <Alert
          type="error"
          showIcon
          message="Не вдалося завантажити повідомлення"
          action={<Button onClick={() => void history.refetch()}>Повторити</Button>}
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
