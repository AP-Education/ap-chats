import {
  ComposerAction,
  ComposerPanel,
  ComposerPanelContent,
  ComposerPanelTrigger,
  useComposer,
  useComposerPanel,
} from '@ap-education/timeline/composer';
import { KeyboardIcon, SmileyIcon } from '@phosphor-icons/react';
import { useCallback, useState } from 'react';

import type { PickedGif } from '../../gifs/types';
import styles from './MessageComposer.module.css';
import { PickerPanel, type PickerTab } from './picker';
import { useComposerBlurRequests } from './useComposerBlurRequests';

const LAST_PICKER_TAB_KEY = 'ap-chats:last-picker-tab';
const PICKER_TABS: PickerTab[] = ['gif', 'sticker', 'emoji'];
const PICKER_LABEL = 'Емодзі, GIF і стікери';
const KEYBOARD_LABEL = 'Клавіатура';

function readLastPickerTab(): PickerTab {
  const stored = localStorage.getItem(LAST_PICKER_TAB_KEY);
  return (PICKER_TABS as string[]).includes(stored ?? '') ? (stored as PickerTab) : 'emoji';
}

/** The tab the picker opens on: the one used last, kept across reloads. */
export function useLastPickerTab() {
  const [tab, setTab] = useState(readLastPickerTab);
  const remember = useCallback((next: PickerTab) => {
    setTab(next);
    localStorage.setItem(LAST_PICKER_TAB_KEY, next);
  }, []);
  return [tab, remember] as const;
}

// On a phone the open picker's button is the way back to the keyboard.
function PickerIcon({ isOpen, isCompact }: { isOpen: boolean; isCompact: boolean }) {
  if (isOpen && isCompact) return <KeyboardIcon size={22} />;
  return <SmileyIcon size={22} weight={isOpen ? 'duotone' : 'regular'} />;
}

interface ComposerPickerProps {
  onPickGif: (gif: PickedGif) => void;
}

/** Emoji, GIFs and stickers: above their button on a desktop, in the keyboard's place on a phone. */
export function ComposerPicker({ onPickGif }: ComposerPickerProps) {
  return (
    <ComposerPanel>
      <Picker onPickGif={onPickGif} />
    </ComposerPanel>
  );
}

function Picker({ onPickGif }: ComposerPickerProps) {
  const { isCompact, insertText } = useComposer();
  const { isOpen, close } = useComposerPanel();
  const [tab, rememberTab] = useLastPickerTab();
  useComposerBlurRequests(close);

  return (
    <>
      {/* One entry point that reopens whatever tab was used last; the panel's own tabs switch. */}
      <ComposerPanelTrigger aria-label={isOpen && isCompact ? KEYBOARD_LABEL : PICKER_LABEL}>
        <PickerIcon isOpen={isOpen} isCompact={isCompact} />
      </ComposerPanelTrigger>
      <ComposerPanelContent>
        <div className={isCompact ? styles.pickerSheet : styles.pickerPopover}>
          <PickerPanel
            activeTab={tab}
            onTabChange={rememberTab}
            onPickEmoji={insertText}
            onPickGif={(gif) => {
              onPickGif(gif);
              close();
            }}
          />
        </div>
      </ComposerPanelContent>
    </>
  );
}

interface NativePickerTriggerProps {
  isOpen: boolean;
  onToggle: () => void;
}

/** The same entry point in the app, where the shell's own picker takes the keyboard's place. */
export function NativePickerTrigger({ isOpen, onToggle }: NativePickerTriggerProps) {
  return (
    <ComposerAction
      aria-label={isOpen ? KEYBOARD_LABEL : PICKER_LABEL}
      aria-pressed={isOpen}
      // The words keep their caret: a press here must not take focus from them first.
      onPointerDown={(event) => event.preventDefault()}
      onClick={onToggle}
    >
      <PickerIcon isOpen={isOpen} isCompact />
    </ComposerAction>
  );
}
