import { createStyles } from 'antd-style';
import { type ReactNode, useState } from 'react';

const useStyles = createStyles(({ token, css }) => ({
  spoiler: css`
    border-radius: 4px;
    background: ${token.colorFillSecondary};
    box-decoration-break: clone;
  `,
  // The text keeps its place, so the shut spoiler is as wide as what it hides.
  shut: css`
    background: ${token.colorTextQuaternary};
    cursor: pointer;

    & > span {
      visibility: hidden;
    }
  `,
}));

interface SpoilerProps {
  children: ReactNode;
  /** In a one-line preview it never opens. */
  inline: boolean;
}

/** Text hidden until someone opens it, as Discord and Telegram hide a spoiler. */
export function Spoiler({ children, inline }: SpoilerProps) {
  const { styles, cx } = useStyles();
  const [isOpen, setOpen] = useState(false);

  if (isOpen) return <span className={styles.spoiler}>{children}</span>;
  if (inline) {
    return (
      <span className={cx(styles.spoiler, styles.shut)}>
        <span>{children}</span>
      </span>
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      aria-label="Показати прихований текст"
      className={cx(styles.spoiler, styles.shut)}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        setOpen(true);
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        setOpen(true);
      }}
    >
      <span>{children}</span>
    </span>
  );
}
