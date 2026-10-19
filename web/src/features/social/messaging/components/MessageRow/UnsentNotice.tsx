import { createStyles } from 'antd-style';

import { useUnsentMessages } from '../../sending/stores/unsent-messages-context';

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
  const { retry, discard } = useUnsentMessages();

  return (
    <div className={styles.notice}>
      Не надіслано
      <button type="button" className={styles.action} onClick={() => retry(rowId)}>
        Повторити
      </button>
      <button type="button" className={styles.action} onClick={() => discard(rowId)}>
        Видалити
      </button>
    </div>
  );
};
