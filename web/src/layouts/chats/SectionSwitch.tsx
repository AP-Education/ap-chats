import { createStyles } from 'antd-style';
import { Link, useLocation } from 'react-router-dom';

import { clientsTab, personalTab, teamTab } from './sections';

const tabs = [clientsTab, teamTab, personalTab];

const useStyles = createStyles(({ token, css }) => ({
  switch: css`
    display: flex;
    gap: 4px;
    margin: 8px 8px 4px;
    padding: 3px;
    border-radius: ${token.borderRadiusLG}px;
    background: ${token.colorFillTertiary};
  `,
  tab: css`
    flex: 1;
    padding: 6px 8px;
    border-radius: ${token.borderRadius}px;
    font-size: 13px;
    text-align: center;
    text-decoration: none;

    &,
    &:link,
    &:visited {
      color: ${token.colorTextSecondary};
    }

    &:hover {
      color: ${token.colorText};
    }

    &:focus-visible {
      outline: none;
      box-shadow: inset 0 0 0 2px ${token.colorPrimaryBorder};
    }
  `,
  on: css`
    background: ${token.colorBgContainer};
    font-weight: 600;
    box-shadow: 0 1px 2px rgb(0 0 0 / 0.08);

    &,
    &:link,
    &:visited,
    &:hover {
      color: ${token.colorPrimaryText};
    }
  `,
}));

/** Clients, the team or the person's own: the three kinds of conversation, one tap apart. */
export function SectionSwitch() {
  const { styles, cx } = useStyles();
  const { pathname } = useLocation();

  return (
    <nav className={styles.switch} aria-label="Conversations">
      {tabs.map((tab) => {
        const active = tab.includes(pathname);
        return (
          <Link
            key={tab.id}
            to={tab.path}
            className={cx(styles.tab, active && styles.on)}
            aria-current={active ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
