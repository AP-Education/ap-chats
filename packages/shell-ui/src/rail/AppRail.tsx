import { createStyles } from 'antd-style';

import { RailTile } from './RailTile';
import type { RailApp } from './types';

const useStyles = createStyles(({ token, css }) => ({
  rail: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    width: 64px;
    flex-shrink: 0;
    min-height: 0;
    padding: 10px 0;
    border-right: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorFillQuaternary};

    @media (max-width: ${token.screenMD}px) {
      padding-block: 8px;
    }
  `,
  divider: css`
    flex-shrink: 0;
    width: 28px;
    height: 2px;
    border-radius: 1px;
    background: ${token.colorBorderSecondary};
  `,
  host: css`
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-height: 0;
    overflow-y: auto;
    padding-bottom: var(--shell-footer-space, 0px);
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  `,
}));

interface AppRailProps {
  tiles: RailApp[];
  onSelect: (id: string) => void;
  onPrefetch: (id: string) => void;
  /** Where applications portal the tiles they contribute. */
  setContributionHost: (element: HTMLElement | null) => void;
}

export function AppRail({ tiles, onSelect, onPrefetch, setContributionHost }: AppRailProps) {
  const { styles } = useStyles();

  return (
    <nav className={styles.rail} aria-label="Застосунки та робочі простори">
      {tiles.map(({ id, label, icon: Icon, href, active, badge }) => (
        <RailTile
          key={id}
          label={label}
          href={href}
          active={active}
          badge={badge}
          onClick={() => onSelect(id)}
          onPrefetch={() => onPrefetch(id)}
        >
          <Icon size={22} weight={active ? 'fill' : 'regular'} />
        </RailTile>
      ))}
      <div className={styles.divider} role="separator" />
      <div ref={setContributionHost} className={styles.host} />
    </nav>
  );
}
