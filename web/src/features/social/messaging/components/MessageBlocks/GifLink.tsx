import { createStyles } from 'antd-style';

const useStyles = createStyles(({ css }) => ({
  // Room below for the time, which sits over a lone GIF and would cover the link otherwise.
  link: css`
    display: block;
    padding-bottom: 1.6em;
    color: var(--bubble-link);
    overflow-wrap: anywhere;
  `,
}));

/** A GIF that cannot be shown still leaves its link, so the message is never empty. */
export function GifLink({ href }: { href: string }) {
  const { styles } = useStyles();

  return (
    <a className={styles.link} href={href} target="_blank" rel="noopener noreferrer">
      {href}
    </a>
  );
}
