import { Segmented } from 'antd';
import { createStyles } from 'antd-style';
import { lazy, Suspense } from 'react';

import { EmojiTabSkeleton } from './EmojiTabSkeleton';
import type { GifResult } from './gif-provider';
import { GifTab } from './GifTab';
import { StickerTab } from './StickerTab';

// emoji-mart's data set is sizeable — load it only once a conversation's composer
// actually opens the emoji tab, instead of shipping it in the main chat bundle.
const EmojiTab = lazy(() => import('./EmojiTab').then((module) => ({ default: module.EmojiTab })));

export type PickerTab = 'gif' | 'sticker' | 'emoji';

const TAB_OPTIONS: { label: string; value: PickerTab }[] = [
  { label: 'GIF', value: 'gif' },
  { label: 'Стікери', value: 'sticker' },
  { label: 'Емодзі', value: 'emoji' },
];

const useStyles = createStyles(({ css }) => ({
  panel: css`
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
  `,
  tabs: css`
    flex-shrink: 0;
    margin-bottom: 8px;
  `,
  body: css`
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  `,
}));

interface PickerPanelProps {
  activeTab: PickerTab;
  onTabChange: (tab: PickerTab) => void;
  onPickEmoji: (emoji: string) => void;
  onPickGif: (gif: GifResult) => void;
}

// Sizing is owned entirely by whatever wraps this panel (the desktop popover's fixed
// box, or the mobile sheet sized to the keyboard height) — every tab just fills 100% of
// the body below the tab switcher, so there's exactly one source of truth for the total
// height and no drift between tabs when switching.
export function PickerPanel({ activeTab, onTabChange, onPickEmoji, onPickGif }: PickerPanelProps) {
  const { styles } = useStyles();

  return (
    <div className={styles.panel}>
      <Segmented
        block
        className={styles.tabs}
        options={TAB_OPTIONS}
        value={activeTab}
        onChange={(value) => onTabChange(value as PickerTab)}
      />
      <div className={styles.body}>
        {activeTab === 'gif' && <GifTab onPick={onPickGif} />}
        {activeTab === 'sticker' && <StickerTab />}
        {activeTab === 'emoji' && (
          <Suspense fallback={<EmojiTabSkeleton />}>
            <EmojiTab onPick={onPickEmoji} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
