import { createStyles } from 'antd-style';

const useStyles = createStyles(({ token, css }) => ({
  badge: css`
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 9px;
    background: ${token.colorError};
    color: ${token.colorWhite};
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
  `,
  small: css`
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 8px;
  `,
}));

interface CountBadgeProps {
  count: number;
  size?: 'small' | 'default';
  /** Announced to screen readers; without it the badge is decorative. */
  label?: string;
  className?: string;
}

/** A count that wants attention, e.g. unread items or pending reviews; renders nothing for zero. */
export function CountBadge({ count, size = 'default', label, className }: CountBadgeProps) {
  const { styles, cx } = useStyles();
  if (count <= 0) return null;

  return (
    <span
      className={cx(styles.badge, size === 'small' && styles.small, className)}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
