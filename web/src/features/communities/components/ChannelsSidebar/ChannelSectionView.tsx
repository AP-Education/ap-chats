import { CaretRightIcon, PlusIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import { ChannelRow } from './ChannelRow';
import { useChannelsSidebarStore } from './channels-sidebar-context';
import { type ChannelSectionData, UNCATEGORIZED } from './useChannelSections';

const useStyles = createStyles(({ token, css }) => ({
  section: css`
    margin: 2px 8px 8px;
    padding: 2px 0 4px;
    border: 1px solid transparent;
    border-radius: ${token.borderRadiusLG}px;
    transition:
      background 0.15s ease,
      border-color 0.15s ease;
  `,
  dropTarget: css`
    background: ${token.colorPrimaryBg};
    border-color: ${token.colorPrimaryBorder};
  `,
  header: css`
    display: flex;
    align-items: center;
    gap: 4px;
    min-height: 32px;
    padding: 4px 8px;
    border-radius: ${token.borderRadius}px;
    user-select: none;

    &:hover [data-role='section-add'] {
      opacity: 1;
    }

    @media (max-width: ${token.screenMD}px) {
      padding-inline: 8px;
      min-height: 44px;
    }
  `,
  collapseButton: css`
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
  chevron: css`
    flex-shrink: 0;
    color: ${token.colorTextQuaternary};
    transition: transform 0.15s ease;
  `,
  chevronOpen: css`
    transform: rotate(90deg);
  `,
  label: css`
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
  add: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    flex-shrink: 0;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: ${token.colorTextTertiary};
    opacity: 0.65;
    transition: all 0.15s ease;

    &:hover {
      background: ${token.colorPrimaryBg};
      color: ${token.colorPrimary};
      opacity: 1;
    }

    &:focus-visible {
      opacity: 1;
      outline: 2px solid ${token.colorPrimary};
    }

    @media (hover: none) {
      opacity: 1;
    }

    @media (max-width: ${token.screenMD}px) {
      width: 36px;
      height: 36px;
    }
  `,
  emptyHint: css`
    margin: 0 8px 6px 24px;
    color: ${token.colorTextQuaternary};
    font-size: ${token.fontSizeSM}px;
  `,
}));

interface ChannelSectionViewProps {
  section: ChannelSectionData;
}

// One category (or the synthetic "uncategorized"/"discoverable" bucket): a
// collapsible header plus its channel rows. Collapse is this section's own
// business, so it stays local rather than lifted to ChannelsSidebar. The
// header's "+" is scoped to this section — creating a channel here never
// asks which category it goes in, mirroring Discord.
export function ChannelSectionView({ section }: ChannelSectionViewProps) {
  const { styles, cx } = useStyles();
  const { requestCreateChannel, draggingChannel, moveChannel } = useChannelsSidebarStore();
  const [collapsed, setCollapsed] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const categoryId = section.id === UNCATEGORIZED ? null : section.id;
  const canDrop =
    section.canCreateChannel && draggingChannel && draggingChannel.categoryId !== categoryId;

  return (
    <div
      className={cx(styles.section, dropActive && styles.dropTarget)}
      onDragOver={(event) => {
        if (!canDrop) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setDropActive(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropActive(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDropActive(false);
        if (canDrop && draggingChannel) moveChannel(draggingChannel, categoryId);
      }}
    >
      <div className={styles.header}>
        <button
          type="button"
          className={styles.collapseButton}
          aria-expanded={!collapsed}
          aria-label={`${collapsed ? 'Розгорнути' : 'Згорнути'} категорію ${section.name}`}
          onClick={() => setCollapsed((prev) => !prev)}
        >
          <CaretRightIcon
            size={12}
            weight="bold"
            className={cx(styles.chevron, !collapsed && styles.chevronOpen)}
          />
          <span className={styles.label}>{section.name}</span>
        </button>
        {section.canCreateChannel && (
          <button
            type="button"
            className={styles.add}
            data-role="section-add"
            aria-label={`Створити канал у категорії ${section.name}`}
            onClick={() => {
              requestCreateChannel({
                categoryId: section.id === UNCATEGORIZED ? undefined : section.id,
                categoryName: section.name,
              });
            }}
          >
            <PlusIcon size={20} />
          </button>
        )}
      </div>
      {!collapsed && section.channels.length === 0 && section.id === UNCATEGORIZED && (
        <div className={styles.emptyHint}>Створіть канал або перетягніть його сюди</div>
      )}
      {!collapsed &&
        section.channels.map((channel) => <ChannelRow key={channel.id} channel={channel} />)}
    </div>
  );
}
