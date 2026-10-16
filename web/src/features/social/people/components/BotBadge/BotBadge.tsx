import styles from './BotBadge.module.css';

/** Marks a member that answers by itself, not a person. */
export function BotBadge() {
  return <span className={styles.badge}>бот</span>;
}
