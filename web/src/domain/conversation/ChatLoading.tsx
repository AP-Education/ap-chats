import { Page, PageAside, PageBody, PageHeader } from '@ap-education/ui';
import { Skeleton } from 'antd';
import { createStyles } from 'antd-style';

const useStyles = createStyles(({ token, css }) => ({
  body: css`
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    padding: 24px;
    min-height: 0;
  `,
  content: css`
    width: min(100%, 360px);
  `,
  composer: css`
    display: flex;
    align-items: flex-end;
    gap: 8px;
    flex-shrink: 0;
    padding: 0 12px 12px;

    @media (max-width: ${token.screenMD}px) {
      gap: 6px;
      padding: 4px 6px calc(6px + env(safe-area-inset-bottom, 0px));
    }
  `,
  input: css`
    flex: 1;
    min-width: 0;
    height: 52px;
    border-radius: 12px;
    background: ${token.colorFillTertiary};

    @media (max-width: ${token.screenMD}px) {
      height: 46px;
      border-radius: 14px;
    }
  `,
  action: css`
    width: 52px;
    height: 52px;
    flex-shrink: 0;
    border-radius: 12px;
    background: ${token.colorFillSecondary};

    @media (max-width: ${token.screenMD}px) {
      width: 46px;
      height: 46px;
      border-radius: 14px;
    }
  `,
  attachment: css`
    display: none;

    @media (max-width: ${token.screenMD}px) {
      display: block;
      width: 46px;
      height: 46px;
      flex-shrink: 0;
      border-radius: 14px;
      background: ${token.colorFillTertiary};
    }
  `,
  members: css`
    padding: 20px 14px;
  `,
  member: css`
    height: 48px;
    display: flex;
    align-items: center;
  `,
}));

export function ChatLoading() {
  const { styles } = useStyles();
  return (
    <Page role="status" aria-label="Завантажуємо канал">
      <PageHeader>
        <Skeleton.Input active size="small" style={{ width: 180 }} />
      </PageHeader>
      <PageBody transparent>
        <div className={styles.body}>
          <div className={styles.content}>
            <Skeleton.Avatar active size={56} shape="square" />
            <Skeleton active title={{ width: '65%' }} paragraph={{ rows: 2 }} />
          </div>
        </div>
        <div className={styles.composer}>
          <div className={styles.attachment} />
          <div className={styles.input} />
          <div className={styles.action} />
        </div>
      </PageBody>
      <PageAside>
        <div className={styles.members}>
          {[0, 1, 2, 3].map((row) => (
            <div className={styles.member} key={row}>
              <Skeleton.Avatar active size={34} />
              <Skeleton.Input active size="small" style={{ width: 120, marginLeft: 10 }} />
            </div>
          ))}
        </div>
      </PageAside>
    </Page>
  );
}
