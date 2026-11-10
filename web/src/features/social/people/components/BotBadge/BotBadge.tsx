import { useTranslation } from 'react-i18next';

import styles from './BotBadge.module.css';

/** Marks a member that answers by itself, not a person. */
export function BotBadge() {
  const { t } = useTranslation('people');

  return <span className={styles.badge}>{t(($) => $.bot)}</span>;
}
