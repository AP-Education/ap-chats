import { GifIcon, PaperclipIcon, SmileyIcon, StickerIcon, XIcon } from '@phosphor-icons/react';
import { Popover } from 'antd';
import { createStyles } from 'antd-style';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useConversation, useConversationScope } from '@/features/social/conversation/store';
import {
  MentionEditor,
  type MentionEditorHandle,
} from '@/features/social/mentions/components/MentionEditor/MentionEditor';
import { useHasCoarsePointer } from '@/shared/hooks/useHasCoarsePointer';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { IconButton } from '@/shared/ui/IconButton';

import type { SendMessageInput } from '../../types';
import { MessageInputSurface } from '../MessageInputSurface/MessageInputSurface';
import { ReplyExcerpt } from '../ReplyExcerpt/ReplyExcerpt';
import { ComposerAction } from './ComposerAction';
import { type GifResult, PickerPanel, type PickerTab } from './picker';
import { useNativeKeyboardBridge } from './useNativeKeyboardBridge';

const DESKTOP_PANEL_WIDTH = 360;
const DESKTOP_PANEL_HEIGHT = 440;

const LAST_PICKER_TAB_KEY = 'ap-chats:last-picker-tab';
const PICKER_TABS: PickerTab[] = ['gif', 'sticker', 'emoji'];

function readLastPickerTab(): PickerTab {
  const stored = localStorage.getItem(LAST_PICKER_TAB_KEY);
  return (PICKER_TABS as string[]).includes(stored ?? '') ? (stored as PickerTab) : 'emoji';
}

const useStyles = createStyles(({ token, css }) => ({
  root: css`
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
  `,
  shell: css`
    flex-shrink: 0;
    display: flex;
    align-items: flex-end;
    gap: 10px;
    padding: 0 ${token.paddingLG}px ${token.paddingSM}px;

    @media (max-width: ${token.screenMD}px) {
      gap: 4px;
      padding: 4px 4px calc(8px + env(safe-area-inset-bottom, 0px));
      border-top: 1px solid ${token.colorBorderSecondary};
      background: ${token.colorBgContainer};
    }
  `,
  desktopPanel: css`
    width: ${DESKTOP_PANEL_WIDTH}px;
    height: ${DESKTOP_PANEL_HEIGHT}px;
  `,
  mobileSheet: css`
    flex-shrink: 0;
    overflow: hidden;
    padding: 8px 10px;
    border-top: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgContainer};
    transition: height 0.15s ease;
  `,
  mobileHidden: css`
    display: inline-flex;

    @media (max-width: ${token.screenMD}px) {
      display: none;
    }
  `,
  mobileOnly: css`
    display: none;

    @media (max-width: ${token.screenMD}px) {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 46px;
      flex-shrink: 0;
    }
  `,
  toolbarRight: css`
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
  `,
  editable: css`
    flex: 1;
    min-width: 0;
    min-height: 40px;
    max-height: 200px;
    overflow-y: auto;
    padding: 8px 4px;
    line-height: 1.45;
    font-size: 16px;
    color: ${token.colorText};
    white-space: pre-wrap;
    word-break: break-word;
    outline: none;
    scrollbar-width: thin;
    scrollbar-color: ${token.colorBorder} transparent;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-thumb {
      background: ${token.colorBorder};
      border-radius: 3px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &:empty::before {
      content: attr(data-placeholder);
      display: block;
      max-width: 100%;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      color: ${token.colorTextQuaternary};
      pointer-events: none;
    }

    @media (max-width: ${token.screenMD}px) {
      min-height: 40px;
      max-height: 160px;
      padding: 8px 0;
    }
  `,
  toolbarButton: css`
    color: ${token.colorTextSecondary};
  `,
  toolbarButtonActive: css`
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimary};
  `,
  reply: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-width: 0;
    padding: 6px 8px;
    border-left: 3px solid ${token.colorPrimary};
    border-radius: 2px;
    background: ${token.colorPrimaryBg};
  `,
}));

interface MessageComposerProps {
  replyAuthor?: string;
  replyPreview?: string;
  onSend: (input: Omit<SendMessageInput, 'clientNonce'>) => void;
}

function readDraft(key: string): { markdown: string; labels: Record<string, string> } {
  const stored = localStorage.getItem(key);
  if (!stored) return { markdown: '', labels: {} };
  try {
    const value = JSON.parse(stored) as { markdown?: string; labels?: Record<string, string> };
    if (typeof value.markdown === 'string')
      return { markdown: value.markdown, labels: value.labels ?? {} };
  } catch {
    return { markdown: stored, labels: {} };
  }
  return { markdown: '', labels: {} };
}

export function MessageComposer({ replyAuthor, replyPreview, onSend }: MessageComposerProps) {
  const { styles, cx } = useStyles();
  const { workspaceId, channelId, composer } = useConversationScope();
  const { identity } = useQueryAuth();
  const draftKey = `ap-chats:draft:${identity}:${workspaceId}:${channelId}`;
  const intent = useConversation((state) => state.intent);
  const setIntent = useConversation((state) => state.setIntent);
  const isMobile = useIsMobile();
  const hasCoarsePointer = useHasCoarsePointer();
  // A tablet (or a touch laptop) doesn't match the narrow-width isMobile check, but
  // still has an on-screen keyboard to swap the picker sheet with — gate that behavior
  // on touch input itself, not viewport width.
  const isCompact = isMobile || hasCoarsePointer;
  const toolbarActionSize = isMobile ? 36 : 38;
  const editableRef = useRef<MentionEditorHandle>(null);
  const initialDraft = useMemo(() => readDraft(draftKey), [draftKey]);
  const [contentState, setContentState] = useState(() => ({
    draftKey,
    hasContent: Boolean(initialDraft.markdown.trim()),
  }));
  const hasContent =
    contentState.draftKey === draftKey
      ? contentState.hasContent
      : Boolean(readDraft(draftKey).markdown.trim());
  const [activeTab, setActiveTab] = useState<PickerTab | null>(null);
  const [lastActiveTab, setLastActiveTab] = useState<PickerTab>(readLastPickerTab);
  const keyboardHeight = useNativeKeyboardBridge();

  useLayoutEffect(() => {
    if (intent || (composer.autoFocus && !isCompact)) editableRef.current?.focus();
  }, [composer.autoFocus, intent, isCompact]);

  function syncHasContent({
    markdown,
    labels,
  }: {
    markdown: string;
    labels: Record<string, string>;
  }) {
    if (markdown) localStorage.setItem(draftKey, JSON.stringify({ markdown, labels }));
    else localStorage.removeItem(draftKey);
    setContentState({ draftKey, hasContent: markdown.trim().length > 0 });
  }

  function handleSend() {
    const markdown = editableRef.current?.markdown().trim();
    if (!markdown) return;
    onSend({
      markdown,
      ...(intent ? { replyToMessageId: intent.messageId } : {}),
      ...(intent?.quoteText ? { quoteText: intent.quoteText } : {}),
    });
    editableRef.current?.clear();
    localStorage.removeItem(draftKey);
    setContentState({ draftKey, hasContent: false });
    setIntent(null);
    closePicker();
    editableRef.current?.focus();
  }

  function insertEmoji(emoji: string) {
    editableRef.current?.insertText(emoji);
  }

  function pickGif(gif: GifResult) {
    onSend({ markdown: `![${gif.title || 'GIF'}](${gif.url})` });
    setIntent(null);
    closePicker();
  }

  function persistLastTab(tab: PickerTab) {
    setLastActiveTab(tab);
    localStorage.setItem(LAST_PICKER_TAB_KEY, tab);
  }

  // Segmented tab clicks inside an already-open panel: switch content, never close.
  function selectTab(tab: PickerTab) {
    setActiveTab(tab);
    persistLastTab(tab);
  }

  // On touch (phone or tablet), opening the panel dismisses the real keyboard and
  // switches the editor to inputMode="none" so a later insertText() (tapping an emoji)
  // can refocus it to place the caret without summoning the keyboard back over the panel.
  function openPicker(tab: PickerTab) {
    if (isCompact) {
      editableRef.current?.blur();
      editableRef.current?.setInputMode('none');
    }
    setActiveTab((current) => {
      const next = current === tab ? null : tab;
      if (next) persistLastTab(next);
      return next;
    });
  }

  function closePicker() {
    setActiveTab(null);
    editableRef.current?.setInputMode('text');
  }

  // Runs on pointerdown, ahead of the browser's own focus handling, so inputMode is back
  // to normal by the time it decides whether to show the keyboard — tapping the text area
  // while the panel is open should swap straight back to the real keyboard, not reopen it
  // with the panel still showing.
  function handleEditorPointerDown() {
    if (isCompact && activeTab) closePicker();
  }

  const toolbarButtons = (
    <div className={styles.toolbarRight}>
      <IconButton
        size={toolbarActionSize}
        className={cx(styles.toolbarButton, activeTab === 'emoji' && styles.toolbarButtonActive)}
        aria-label="Емодзі"
        aria-pressed={activeTab === 'emoji'}
        onClick={() => openPicker('emoji')}
      >
        <SmileyIcon size={22} weight={activeTab === 'emoji' ? 'duotone' : 'regular'} />
      </IconButton>
      <IconButton
        size={toolbarActionSize}
        className={cx(styles.toolbarButton, activeTab === 'gif' && styles.toolbarButtonActive)}
        aria-label="GIF"
        aria-pressed={activeTab === 'gif'}
        onClick={() => openPicker('gif')}
      >
        <GifIcon size={22} weight={activeTab === 'gif' ? 'duotone' : 'regular'} />
      </IconButton>
      <IconButton
        size={toolbarActionSize}
        className={cx(styles.toolbarButton, activeTab === 'sticker' && styles.toolbarButtonActive)}
        aria-label="Стікери"
        aria-pressed={activeTab === 'sticker'}
        onClick={() => openPicker('sticker')}
      >
        <StickerIcon size={22} weight={activeTab === 'sticker' ? 'duotone' : 'regular'} />
      </IconButton>
    </div>
  );

  // Compact (phone/tablet): one entry point that reopens whatever tab was used last,
  // instead of three icons competing for a narrow toolbar.
  const compactToolbarButton = (
    <div className={styles.toolbarRight}>
      <IconButton
        size={toolbarActionSize}
        className={cx(styles.toolbarButton, activeTab !== null && styles.toolbarButtonActive)}
        aria-label="Емодзі, GIF і стікери"
        aria-pressed={activeTab !== null}
        onClick={() => openPicker(lastActiveTab)}
      >
        <SmileyIcon size={22} weight={activeTab !== null ? 'duotone' : 'regular'} />
      </IconButton>
    </div>
  );

  return (
    <div className={styles.root}>
      <div className={styles.shell}>
        <span className={styles.mobileOnly}>
          <IconButton size={36} className={styles.toolbarButton} aria-label="Додати файл" disabled>
            <PaperclipIcon size={22} />
          </IconButton>
        </span>
        <MessageInputSurface
          context={
            intent && (
              <div className={styles.reply}>
                <ReplyExcerpt
                  title={intent.quoteText ? 'Цитата' : `Відповідь для ${replyAuthor ?? 'учасника'}`}
                  markdown={replyPreview ?? 'Повідомлення'}
                  quoteText={intent.quoteText}
                />
                <IconButton
                  size={28}
                  aria-label="Скасувати відповідь"
                  onClick={() => setIntent(null)}
                >
                  <XIcon size={16} />
                </IconButton>
              </div>
            )
          }
          leading={
            <span className={styles.mobileHidden}>
              <IconButton
                size={toolbarActionSize}
                className={styles.toolbarButton}
                aria-label="Додати файл"
                disabled
              >
                <PaperclipIcon size={22} />
              </IconButton>
            </span>
          }
          trailing={
            isCompact ? (
              compactToolbarButton
            ) : (
              <Popover
                trigger={[]}
                open={activeTab !== null}
                onOpenChange={(open) => !open && closePicker()}
                placement="topRight"
                content={
                  <div className={styles.desktopPanel}>
                    <PickerPanel
                      activeTab={activeTab ?? 'emoji'}
                      onTabChange={selectTab}
                      onPickEmoji={insertEmoji}
                      onPickGif={pickGif}
                    />
                  </div>
                }
              >
                {toolbarButtons}
              </Popover>
            )
          }
        >
          <div onPointerDownCapture={handleEditorPointerDown} style={{ display: 'contents' }}>
            <MentionEditor
              key={draftKey}
              editorRef={editableRef}
              initialDraft={initialDraft}
              className={styles.editable}
              ariaLabel={composer.ariaLabel}
              placeholder={composer.placeholder}
              onChange={syncHasContent}
              onSubmit={handleSend}
              onEscape={() => (activeTab ? closePicker() : setIntent(null))}
            />
          </div>
        </MessageInputSurface>
        <ComposerAction hasContent={hasContent} onSend={handleSend} />
      </div>
      {isCompact && activeTab && (
        <div className={styles.mobileSheet} style={{ height: keyboardHeight }}>
          <PickerPanel
            activeTab={activeTab}
            onTabChange={selectTab}
            onPickEmoji={insertEmoji}
            onPickGif={pickGif}
          />
        </div>
      )}
    </div>
  );
}
