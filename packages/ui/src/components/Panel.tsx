import { CaretRightIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';
import {
  type ComponentType,
  type HTMLAttributes,
  type MouseEvent,
  type PropsWithChildren,
  type ReactNode,
  useState,
} from 'react';

import { useIsMobile } from '../hooks/useIsMobile';

const useStyles = createStyles(({ token, css }) => ({
  panel: css`
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  `,
  header: css`
    position: relative;
    display: flex;
    align-items: center;
    height: 60px;
    flex-shrink: 0;

    @media (max-width: ${token.screenMD}px) {
      height: 56px;
    }
  `,
  title: css`
    flex: 1;
    min-width: 0;
    padding: 0 16px;
    overflow: hidden;
    color: ${token.colorText};
    font-size: 16px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  nav: css`
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 12px;
    flex-shrink: 0;

    @media (max-width: ${token.screenMD}px) {
      padding: 8px 12px;
    }
  `,
  item: css`
    display: flex;
    align-items: center;
    gap: 10px;
    height: 38px;
    padding: 0 10px;
    width: 100%;
    border: 0;
    border-radius: ${token.borderRadius}px;
    background: transparent;
    color: ${token.colorTextSecondary};
    font: inherit;
    font-weight: 500;
    text-align: left;
    cursor: pointer;
    text-decoration: none;
    transition:
      background 0.15s ease,
      color 0.15s ease;

    @media (max-width: ${token.screenMD}px) {
      height: 44px;
      gap: 12px;
      padding-inline: 12px;
      font-size: 16px;
    }

    &:hover {
      background: ${token.colorFillTertiary};
      color: ${token.colorText};
    }
  `,
  itemActive: css`
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimaryTextActive};

    &:hover {
      background: ${token.colorPrimaryBgHover};
      color: ${token.colorPrimaryTextActive};
    }
  `,
  label: css`
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  divider: css`
    height: 1px;
    margin: 4px 16px 8px;
    background: ${token.colorBorderSecondary};
    flex-shrink: 0;
  `,
  sectionHeader: css`
    display: flex;
    align-items: center;
    gap: 4px;
    min-height: 32px;
    padding: 4px 8px;
    border-radius: ${token.borderRadius}px;
    user-select: none;

    &:hover > [data-section-extra],
    &:focus-within > [data-section-extra] {
      opacity: 1;
    }

    @media (max-width: ${token.screenMD}px) {
      min-height: 44px;
    }
  `,
  sectionToggle: css`
    display: flex;
    align-items: center;
    gap: 5px;
    flex: 1;
    min-width: 0;
    padding: 3px 0;
    border: 0;
    background: transparent;
    text-align: left;
    cursor: pointer;

    @media (max-width: ${token.screenMD}px) {
      min-height: 36px;
    }

    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: 2px;
    }
  `,
  sectionChevron: css`
    flex-shrink: 0;
    color: ${token.colorTextQuaternary};
    transition: transform 0.15s ease;
  `,
  sectionChevronOpen: css`
    transform: rotate(90deg);
  `,
  sectionLabel: css`
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: ${token.colorTextTertiary};

    @media (max-width: ${token.screenMD}px) {
      font-size: 12px;
      color: ${token.colorTextSecondary};
    }
  `,
  sectionExtra: css`
    display: flex;
    align-items: center;
    flex-shrink: 0;
    opacity: 0.65;
    transition: opacity 0.15s ease;

    @media (hover: none) {
      opacity: 1;
    }
  `,
  body: css`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding-bottom: var(--shell-footer-space, 0px);
  `,
}));

/** An application's sider panel: header, navigation, then a scrolling body. */
export function Panel({ children }: PropsWithChildren) {
  const { styles } = useStyles();
  return <div className={styles.panel}>{children}</div>;
}

export function PanelHeader({ children }: PropsWithChildren) {
  const { styles } = useStyles();
  return <div className={styles.header}>{children}</div>;
}

export function PanelTitle({ children }: PropsWithChildren) {
  const { styles } = useStyles();
  return <span className={styles.title}>{children}</span>;
}

export function PanelNav({ children }: PropsWithChildren) {
  const { styles } = useStyles();
  return <nav className={styles.nav}>{children}</nav>;
}

interface PanelNavItemProps {
  icon: ComponentType<{ size?: number; weight?: 'regular' | 'fill' }>;
  label: string;
  active?: boolean;
  /** Trailing content, usually a `CountBadge`. */
  badge?: ReactNode;
  /** Renders a link; `onClick` then replaces plain clicks so a router can navigate. */
  href?: string;
  onClick?: () => void;
}

export function PanelNavItem({
  icon: Icon,
  label,
  active = false,
  badge,
  href,
  onClick,
}: PanelNavItemProps) {
  const { styles, cx } = useStyles();
  const isMobile = useIsMobile();
  const className = cx(styles.item, active && styles.itemActive);
  const content = (
    <>
      <Icon size={isMobile ? 22 : 20} weight={active ? 'fill' : 'regular'} />
      <span className={styles.label}>{label}</span>
      {badge}
    </>
  );

  function handleLinkClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!onClick || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    onClick();
  }

  if (href) {
    return (
      <a
        href={href}
        className={className}
        aria-current={active ? 'page' : undefined}
        onClick={handleLinkClick}
      >
        {content}
      </a>
    );
  }

  return (
    <button type="button" className={className} aria-pressed={active} onClick={onClick}>
      {content}
    </button>
  );
}

export function PanelDivider() {
  const { styles } = useStyles();
  return <div className={styles.divider} />;
}

interface PanelSectionProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Without a title the section has no heading and does not collapse. */
  title?: string;
  /** Controls at the end of the heading, revealed on hover where hover exists. */
  extra?: ReactNode;
  defaultCollapsed?: boolean;
}

/** A titled, collapsible group inside the panel body: a category, a period, a folder. */
export function PanelSection({
  title,
  extra,
  defaultCollapsed = false,
  children,
  ...rest
}: PanelSectionProps) {
  const { styles, cx } = useStyles();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const isCollapsed = Boolean(title) && collapsed;

  return (
    <section {...rest}>
      {title && (
        <div className={styles.sectionHeader}>
          <button
            type="button"
            className={styles.sectionToggle}
            aria-expanded={!collapsed}
            aria-label={`${collapsed ? 'Розгорнути' : 'Згорнути'} ${title}`}
            onClick={() => setCollapsed((value) => !value)}
          >
            <CaretRightIcon
              size={12}
              weight="bold"
              className={cx(styles.sectionChevron, !collapsed && styles.sectionChevronOpen)}
            />
            <span className={styles.sectionLabel}>{title}</span>
          </button>
          {extra && (
            <div className={styles.sectionExtra} data-section-extra>
              {extra}
            </div>
          )}
        </div>
      )}
      {!isCollapsed && children}
    </section>
  );
}

/** The scrolling part under the navigation; `hidden` keeps it mounted but out of view. */
export function PanelBody({ hidden = false, children }: PropsWithChildren<{ hidden?: boolean }>) {
  const { styles } = useStyles();
  return (
    <div className={styles.body} hidden={hidden}>
      {children}
    </div>
  );
}
