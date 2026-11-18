import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';

import { dateTimeFormat } from '@/shared/i18n/format';
import { useChatsLanguage } from '@/shared/i18n/useChatsLanguage';

import { useShellInfo } from '../hooks/useShellInfo';

const publishedAt = dateTimeFormat({ dateStyle: 'medium', timeStyle: 'short' });

// The shell's own profile sections: a rule above, 24px around, an 18px heading.
const useStyles = createStyles(({ token, css }) => ({
  section: css`
    padding: 24px 0;
    border-top: 1px solid ${token.colorBorderSecondary};

    h2 {
      margin: 0 0 16px;
      font-size: 18px;
    }
  `,
  list: css`
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    gap: 8px 16px;
    margin: 0;
  `,
  term: css`
    color: ${token.colorTextSecondary};
  `,
  value: css`
    margin: 0;
    overflow-wrap: anywhere;
    user-select: text;
  `,
  code: css`
    font-family: ${token.fontFamilyCode};
    font-size: ${token.fontSizeSM}px;
  `,
}));

/**
 * Which build and which over-the-air update this phone runs, so a tester can match it with the
 * update status table. Only the phone app answers, so a browser shows nothing.
 */
export function AppInfoSection() {
  const { styles, cx } = useStyles();
  const { t } = useTranslation('appInfo');
  const language = useChatsLanguage();
  const info = useShellInfo();
  if (!info) return null;

  const version = [info.appVersion, info.buildNumber && `(${info.buildNumber})`]
    .filter(Boolean)
    .join(' ');
  const published = info.updateCreatedAt ? new Date(info.updateCreatedAt) : null;

  return (
    <section className={styles.section} aria-labelledby="chats-app-info">
      <h2 id="chats-app-info">{t(($) => $.title)}</h2>
      <dl className={styles.list}>
        <dt className={styles.term}>{t(($) => $.version)}</dt>
        <dd className={styles.value}>{version || '—'}</dd>

        <dt className={styles.term}>{t(($) => $.channel)}</dt>
        <dd className={styles.value}>{info.channel ?? t(($) => $.updatesOff)}</dd>

        {info.channel && (
          <>
            <dt className={styles.term}>{t(($) => $.update)}</dt>
            <dd className={styles.value}>
              {info.updateId ? (
                <>
                  <span className={styles.code}>{info.updateId}</span>
                  {published && !Number.isNaN(published.getTime()) && (
                    <>
                      <br />
                      {t(($) => $.published, { date: publishedAt(language).format(published) })}
                    </>
                  )}
                </>
              ) : (
                t(($) => $.embedded)
              )}
            </dd>
          </>
        )}

        {info.runtimeVersion && (
          <>
            <dt className={styles.term}>{t(($) => $.runtime)}</dt>
            <dd className={cx(styles.value, styles.code)}>{info.runtimeVersion}</dd>
          </>
        )}
      </dl>
    </section>
  );
}
