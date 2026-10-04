import { createStyles } from 'antd-style';

const useStyles = createStyles(({ token, css }) => ({
  surface: css`
    --app-loading-background: ${token.colorBgLayout};
    --app-loading-text: ${token.colorText};
    --app-loading-muted: ${token.colorTextSecondary};
    --app-loading-accent: ${token.colorPrimary};
    --app-loading-track: ${token.colorPrimaryBorder};
  `,
}));

export function AppLoading() {
  const { styles, cx } = useStyles();

  return (
    <main className={cx('app-loading', styles.surface)} aria-busy="true">
      <div className="app-loading__content">
        <span className="app-loading__mark" aria-hidden="true">
          AP
        </span>
        <h1 className="app-loading__name">AP Chats</h1>
        <div className="app-loading__status" role="status">
          <span className="app-loading__indicator" aria-hidden="true" />
          <span>Відкриваємо застосунок</span>
        </div>
      </div>
    </main>
  );
}
