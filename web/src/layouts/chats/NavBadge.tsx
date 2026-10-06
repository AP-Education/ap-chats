import { useChatsLayoutStyles } from './useChatsLayoutStyles';

export function NavBadge({ count }: { count: number }) {
  const { styles } = useChatsLayoutStyles();
  if (count === 0) return null;
  return (
    <span className={styles.navBadge} aria-label={`${count} непрочитаних`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}
