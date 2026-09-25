import { LoadingOutlined, WarningFilled } from '@ant-design/icons';
import { createStyles, keyframes } from 'antd-style';

import { useSocketEvent } from '../hooks/useSocketEvent';
import { sessionReadySchema } from '../schemas';
import { useConnection } from '../stores/connect-context';

const slideDown = keyframes`
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
`;

const useStyles = createStyles(({ token, css }) => ({
  banner: css`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${token.marginXS}px;
    padding: ${token.paddingXXS}px ${token.padding}px;
    font-size: ${token.fontSize}px;
    font-weight: ${token.fontWeightStrong};
    line-height: ${token.lineHeight};
    animation: ${slideDown} ${token.motionDurationMid} ${token.motionEaseOut};
  `,
  warning: css`
    color: ${token.colorWarningTextActive};
    background: ${token.colorWarningBg};
    border-bottom: 1px solid ${token.colorWarningBorder};
  `,
  error: css`
    color: ${token.colorErrorTextActive};
    background: ${token.colorErrorBg};
    border-bottom: 1px solid ${token.colorErrorBorder};
  `,
  icon: css`
    font-size: ${token.fontSizeLG}px;
    display: flex;
  `,
}));

export function ConnectionBanner() {
  const { status, error } = useConnection();
  const { styles, cx } = useStyles();

  useSocketEvent('session:ready', (payload) => {
    const result = sessionReadySchema.safeParse(payload);
    if (!result.success) {
      console.error('Невалідний payload session:ready', result.error);
    }
  });

  if (status !== 'reconnecting' && status !== 'error') return null;

  const isAuthError = status === 'error' && error?.kind === 'auth';
  const message = isAuthError
    ? 'Не вдалося підключитися до сервера. Оновіть сторінку.'
    : status === 'reconnecting'
      ? 'Відновлюємо з’єднання'
      : 'Ви офлайн. Намагаємось відновити з’єднання';

  return (
    <div className={cx(styles.banner, isAuthError ? styles.error : styles.warning)} role="status">
      <span className={styles.icon}>{isAuthError ? <WarningFilled /> : <LoadingOutlined />}</span>
      {message}
    </div>
  );
}
