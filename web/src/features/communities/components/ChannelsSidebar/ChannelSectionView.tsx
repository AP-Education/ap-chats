import { PanelSection } from '@ap/ui';
import { PlusIcon } from '@phosphor-icons/react';
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
    transition: all 0.15s ease;

    &:hover {
      background: ${token.colorPrimaryBg};
      color: ${token.colorPrimary};
    }

    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
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

export function ChannelSectionView({ section }: ChannelSectionViewProps) {
  const { styles, cx } = useStyles();
  const { requestCreateChannel, draggingChannel, moveChannel } = useChannelsSidebarStore();
  const [dropActive, setDropActive] = useState(false);
  const isUncategorized = section.id === UNCATEGORIZED;
  const categoryId = isUncategorized ? null : section.id;
  const canDrop =
    section.canCreateChannel && draggingChannel && draggingChannel.categoryId !== categoryId;

  if (isUncategorized && section.channels.length === 0 && !canDrop) return null;

  return (
    <PanelSection
      title={isUncategorized ? undefined : section.name}
      extra={
        section.canCreateChannel && (
          <button
            type="button"
            className={styles.add}
            aria-label={`Створити канал у категорії ${section.name}`}
            onClick={() => {
              requestCreateChannel({
                categoryId: section.id,
                categoryName: section.name,
              });
            }}
          >
            <PlusIcon size={20} />
          </button>
        )
      }
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
      {isUncategorized && section.channels.length === 0 && canDrop && (
        <div className={styles.emptyHint}>Створіть канал або перетягніть його сюди</div>
      )}
      {section.channels.map((channel) => (
        <ChannelRow key={channel.id} channel={channel} />
      ))}
    </PanelSection>
  );
}
