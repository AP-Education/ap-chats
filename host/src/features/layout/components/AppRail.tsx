import type { AppManifest } from '@ap/shell-sdk';
import { NavTile } from '@ap/ui';
import { createStyles } from 'antd-style';
import { useNavigate } from 'react-router-dom';

import { useShellHostRef } from '@/features/layout/stores/shell-layout-context';

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

/** An application on the rail; `href` is where the tile leads right now. */
export interface RailTile {
  app: AppManifest;
  href: string;
  active: boolean;
  badge: number;
  /** Starts loading the application's code, e.g. on hover. */
  prefetch: () => void;
}

export function AppRail({ tiles }: { tiles: RailTile[] }) {
  const { styles } = useStyles();
  const navigate = useNavigate();
  const contributionHostRef = useShellHostRef('rail');

  return (
    <nav className={styles.rail} aria-label="Застосунки">
      {tiles.map(({ app, href, active, badge, prefetch }) => (
        <NavTile
          key={app.id}
          label={app.label}
          href={href}
          active={active}
          badge={badge}
          onClick={() => void navigate(href)}
          onPrefetch={prefetch}
        >
          <app.icon size={22} weight={active ? 'fill' : 'regular'} />
        </NavTile>
      ))}
      <div className={styles.divider} role="separator" />
      <div ref={contributionHostRef} className={styles.host} />
    </nav>
  );
}
