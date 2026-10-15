import { createStyles } from 'antd-style';

const useStyles = createStyles(({ token, css }) => ({
  // A soft accent tag with a hairline edge; inside a bubble it takes the bubble's checked accent.
  badge: css`
    --badge-ink: var(--bubble-accent, ${token.colorPrimaryTextActive});
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    height: 16px;
    padding: 0 5px;
    border: 1px solid color-mix(in srgb, var(--badge-ink) 45%, transparent);
    border-radius: ${token.borderRadiusSM}px;
    background: color-mix(in srgb, var(--badge-ink) 14%, transparent);
    color: var(--badge-ink);
    font-size: 11px;
    font-weight: 600;
    line-height: 1;
  `,
}));

/** Marks a member that answers by itself, not a person. */
export function BotBadge() {
  const { styles } = useStyles();
  return <span className={styles.badge}>бот</span>;
}
