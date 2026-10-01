import { useMainLayoutStyles } from './useMainLayoutStyles';

export function NavBadge({ count }: { count: number }) {
  const { styles } = useMainLayoutStyles();
  if (count === 0) return null;
  return (
    <span className={styles.navBadge} aria-label={`${count} непрочитаних`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}
