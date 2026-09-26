import { createStyles } from 'antd-style';
import type { ReactNode } from 'react';

const useStyles = createStyles(({ token, css }) => ({
  panel: css`
    width: 260px;
  `,
  header: css`
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: ${token.colorText};
    margin-bottom: 4px;
  `,
  description: css`
    margin: 0 0 10px;
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSizeSM}px;
  `,
  grid: css`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  `,
  tile: css`
    height: 44px;
    border-radius: ${token.borderRadius}px;
    background: ${token.colorFillTertiary};
  `,
}));

interface MockPopoverContentProps {
  icon: ReactNode;
  title: string;
  description: string;
}

export function MockPopoverContent({ icon, title, description }: MockPopoverContentProps) {
  const { styles } = useStyles();

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        {icon}
        <span>{title}</span>
      </div>
      <p className={styles.description}>{description}</p>
      <div className={styles.grid}>
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className={styles.tile} />
        ))}
      </div>
    </div>
  );
}
