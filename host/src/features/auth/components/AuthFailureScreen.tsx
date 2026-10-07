import { Button } from 'antd';
import { createStyles } from 'antd-style';

const useStyles = createStyles(({ token, css }) => ({
  screen: css`
    display: grid;
    place-items: center;
    height: 100dvh;
    overflow: auto;
    padding: ${token.paddingLG}px;
    background: ${token.colorBgLayout};
    color: ${token.colorText};
  `,
  content: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: ${token.marginMD}px;
    max-width: 360px;
    text-align: center;
  `,
  title: css`
    margin: 0;
    font-size: ${token.fontSizeHeading4}px;
    line-height: 1.4;
  `,
  description: css`
    margin: 0;
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSize}px;
    line-height: 1.5;
  `,
  retry: css`
    min-height: 44px;
    padding-inline: ${token.paddingLG}px;
  `,
}));

interface AuthFailureScreenProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function AuthFailureScreen({
  title = 'Не вдалося увійти',
  description = 'Спробуйте ще раз.',
  onRetry,
}: AuthFailureScreenProps) {
  const { styles } = useStyles();

  return (
    <main className={styles.screen}>
      <div className={styles.content} role="alert">
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>
        {onRetry && (
          <Button type="primary" className={styles.retry} onClick={onRetry}>
            Спробувати ще раз
          </Button>
        )}
      </div>
    </main>
  );
}
