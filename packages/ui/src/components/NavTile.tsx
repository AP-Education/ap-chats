import { PlusIcon } from '@phosphor-icons/react';
import { Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import type { MouseEvent, ReactNode } from 'react';

import { useIsMobile } from '../hooks/useIsMobile';
import { CountBadge } from './CountBadge';

const useStyles = createStyles(({ token, css }) => ({
  slot: css`
    position: relative;
    display: flex;
    flex-shrink: 0;
    justify-content: center;
    width: 100%;

    &::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      width: 4px;
      height: 0;
      border-radius: 0 4px 4px 0;
      background: ${token.colorPrimary};
      transform: translateY(-50%);
      transition: height ${token.motionDurationMid} ${token.motionEaseOut};
    }

    &:hover::before {
      height: 16px;
    }

    &[data-active='true']::before {
      height: 28px;
    }

    @media (prefers-reduced-motion: reduce) {
      &::before {
        transition: none;
      }
    }
  `,
  tile: css`
    position: relative;
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    padding: 0;
    overflow: hidden;
    border: 2px solid transparent;
    border-radius: ${token.borderRadiusLG}px;
    background: ${token.colorBgContainer};
    box-shadow: 0 0 0 1px ${token.colorBorderSecondary};
    color: ${token.colorTextSecondary};
    text-decoration: none;
    cursor: pointer;
    transition:
      background ${token.motionDurationFast} ease,
      color ${token.motionDurationFast} ease,
      border-color ${token.motionDurationFast} ease;

    &:hover {
      background: ${token.colorFillTertiary};
      color: ${token.colorText};
    }

    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: 2px;
    }

    &[data-active='true'] {
      border-color: ${token.colorPrimary};
      background: ${token.colorPrimaryBg};
      color: ${token.colorPrimaryTextActive};
    }
  `,
  add: css`
    border: 1.5px dashed ${token.colorBorder};
    box-shadow: none;
    background: transparent;
    color: ${token.colorTextTertiary};

    &:hover {
      border-color: ${token.colorPrimary};
      background: ${token.colorPrimaryBg};
      color: ${token.colorPrimary};
    }
  `,
  badge: css`
    position: absolute;
    right: -2px;
    bottom: -2px;
  `,
}));

export interface NavTileProps {
  label: string;
  active?: boolean;
  badge?: number;
  /** Renders a link, so the tile can be opened in a new tab. */
  href?: string;
  onClick?: () => void;
  onPrefetch?: () => void;
  children: ReactNode;
  variant?: 'default' | 'add';
}

/** A square navigation tile with an active marker, used by rails. */
export function NavTile({
  label,
  active = false,
  badge = 0,
  href,
  onClick,
  onPrefetch,
  children,
  variant = 'default',
}: NavTileProps) {
  const { styles, cx } = useStyles();
  const isMobile = useIsMobile();
  const className = cx(styles.tile, variant === 'add' && styles.add);
  const content = (
    <>
      {children}
      <CountBadge count={badge} size="small" className={styles.badge} />
    </>
  );

  function handleLinkClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    onClick?.();
  }

  return (
    <Tooltip title={isMobile ? undefined : label} placement="right" mouseEnterDelay={0.3}>
      <div className={styles.slot} data-active={active}>
        {href ? (
          <a
            href={href}
            className={className}
            data-active={active}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            onClick={handleLinkClick}
            onPointerEnter={onPrefetch}
            onFocus={onPrefetch}
          >
            {content}
          </a>
        ) : (
          <button
            type="button"
            className={className}
            data-active={active}
            aria-label={label}
            aria-pressed={variant === 'add' ? undefined : active}
            onClick={onClick}
          >
            {content}
          </button>
        )}
      </div>
    </Tooltip>
  );
}

export function NavAddTile({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <NavTile label={label} variant="add" onClick={onClick}>
      <PlusIcon size={20} />
    </NavTile>
  );
}
