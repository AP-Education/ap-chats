import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';

import { useUnsentMessages } from '../../unsent-messages-context';

const useStyles = createStyles(({ token, css }) => ({
  notice: css`
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--bubble-meta);
    font-size: ${token.fontSizeSM}px;
  `,
  action: css`
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--bubble-link);
    font: inherit;
    font-weight: 600;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  `,
}));

interface UnsentNoticeProps {
  rowId: string;
}

export const UnsentNotice = ({ rowId }: UnsentNoticeProps) => {
  const { styles } = useStyles();
  const { t } = useTranslation(['messaging', 'common']);
  const { retry, discard } = useUnsentMessages();

  return (
    <div className={styles.notice}>
      {t(($) => $.message.delivery.failed)}
      <button type="button" className={styles.action} onClick={() => retry(rowId)}>
        {t(($) => $.common.actions.retry)}
      </button>
      <button type="button" className={styles.action} onClick={() => discard(rowId)}>
        {t(($) => $.common.actions.delete)}
      </button>
    </div>
  );
};
