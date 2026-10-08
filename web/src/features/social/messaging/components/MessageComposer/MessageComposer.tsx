import { isNativeShell } from '@ap-education/shell-sdk';
import { IconButton, useIsMobile } from '@ap-education/ui';
import {
  GifIcon,
  KeyboardIcon,
  PaperclipIcon,
  SmileyIcon,
  StickerIcon,
  XIcon,
} from '@phosphor-icons/react';
import { Button, Popover } from 'antd';
import { createStyles } from 'antd-style';
import {
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useConversation, useConversationScope } from '@/features/social/conversation/store';
import { useHasCoarsePointer } from '@/shared/hooks/useHasCoarsePointer';
import { randomId } from '@/shared/lib/random-id';

import { useAttachments } from '../../attachments/useAttachments';
import { MessageEditorSlotProvider } from '../../MessageEditorSlot';
import type {
  ComposerEditorApi,
  ComposerEditorSlotProps,
  PendingAttachmentCommit,
  SendMessageCommand,
} from '../../types';
import { MessageInputSurface } from '../MessageInputSurface/MessageInputSurface';
import { ReplyExcerpt } from '../ReplyExcerpt/ReplyExcerpt';
import { AttachmentDrafts } from './AttachmentDrafts/AttachmentDrafts';
import { useAttachmentDrop } from './AttachmentDropZone';
import { ComposerAction } from './ComposerAction';
import { type GifResult, PickerPanel, type PickerTab } from './picker';
import { useBrowserKeyboardHeight } from './useBrowserKeyboardHeight';
import { useComposerDraft } from './useComposerDraft';
import { useNativeComposerInput } from './useNativeComposerInput';

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
  suggestions: css`
    position: relative;
    margin: 0 12px;

    @media (max-width: ${token.screenMD}px) {
      margin: 0 6px;
    }
  `,
  // Floats over the wallpaper and the messages scrolling beneath it; only its controls
  // take pointer input, the transparent gaps between them pass it through.
  shell: css`
    flex-shrink: 0;
    display: flex;
    align-items: flex-end;
    gap: 8px;
    padding: 0 12px 12px;

    & > * {
      pointer-events: auto;
    }

    @media (max-width: ${token.screenMD}px) {
      gap: 8px;
      padding: 4px 8px calc(8px + env(safe-area-inset-bottom, 0px));
      html[data-native-shell='true'] & {
        padding-bottom: 8px;
      }
    }
  `,
  desktopPanel: css`
    width: ${DESKTOP_PANEL_WIDTH}px;
    height: ${DESKTOP_PANEL_HEIGHT}px;
  `,
  mobileSheet: css`
    flex-shrink: 0;
    overflow: hidden;
    pointer-events: auto;
    padding: 8px 10px;
    border-top: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgContainer};
    // Deliberately no transition: the real keyboard's own close animation already
    // plays out at its own pace (and we have no way to read its progress frame by
    // frame from web content); animating this height on top of that produces a visible
    // double-motion/rebound instead of a clean swap. Snapping instantly to the
    // remembered height reads as "the keyboard became the panel", not two animations.
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
      width: 44px;
      height: 44px;
      flex-shrink: 0;
      border-radius: 50%;
      background: var(--glass, rgba(255, 255, 255, 0.86));
      backdrop-filter: var(--glass-blur, blur(24px) saturate(1.5));
      box-shadow: 0 1px 2px rgba(23, 46, 42, 0.12);
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
    font-size: var(--app-text-size, 16px);
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
      border-radius: ${token.borderRadiusXS}px;
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

    // With the 4px around it this makes a 44px line, the text centred in it. iOS zooms the
    // page into any field set below 16px, so smaller picks stop there on phones.
    @media (max-width: ${token.screenMD}px) {
      min-height: 36px;
      max-height: 160px;
      padding: 6px 0;
      font-size: max(16px, var(--app-text-size, 16px));
    }
  `,
  toolbarButton: css`
    color: ${token.colorTextSecondary};
  `,
  toolbarButtonActive: css`
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimaryTextActive};
  `,
  reply: css`
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-width: 0;
    padding: ${token.paddingXXS}px ${token.paddingXXS}px ${token.paddingXXS}px ${token.padding}px;
    border-radius: ${token.borderRadius}px;
    background: ${token.colorPrimaryBg};

    &::before {
      content: '';
      position: absolute;
      top: 6px;
      bottom: 6px;
      left: 6px;
      width: 4px;
      border-radius: ${token.borderRadiusXS}px;
      background: ${token.colorPrimary};
    }
  `,
}));

interface MessageComposerProps {
  replyAuthor?: string;
  replyPreview?: string;
  onSend: (
    input: Omit<SendMessageCommand, 'clientNonce' | 'attachments'>,
    pending?: PendingAttachmentCommit,
  ) => void;
  /** The text-input to compose with — e.g. `<MentionEditor />` — wired via MessageEditorSlotProvider. */
  children: ReactNode;
}

export function MessageComposer({
  replyAuthor,
  replyPreview,
  onSend,
  children,
}: MessageComposerProps) {
  const { styles, cx } = useStyles();
  const { workspaceId, channelId, composer } = useConversationScope();
  const { identity } = useQueryAuth();
  const draftKey = `ap-chats:draft:${identity}:${workspaceId}:${channelId}`;
  const intent = useConversation((state) => state.intent);
  const setIntent = useConversation((state) => state.setIntent);
  const blurComposerToken = useConversation((state) => state.blurComposerToken);
  const isMobile = useIsMobile();
  const hasCoarsePointer = useHasCoarsePointer();
  // A tablet (or a touch laptop) doesn't match the narrow-width isMobile check, but
  // still has an on-screen keyboard to swap the picker sheet with — gate that behavior
  // on touch input itself, not viewport width.
  const isCompact = isMobile || hasCoarsePointer;
  const toolbarActionSize = isMobile ? 36 : 38;
  const editableRef = useRef<ComposerEditorApi>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploads = useAttachments();
  const { bindTarget, overlay } = useAttachmentDrop(uploads.addFiles);
  const {
    initialDraft,
    hasContent,
    sync: syncHasContent,
    clear: clearDraft,
  } = useComposerDraft(draftKey);
  const [suggestionsHost, setSuggestionsHost] = useState<HTMLDivElement | null>(null);
  const [webActiveTab, setActiveTab] = useState<PickerTab | null>(null);
  const [lastActiveTab, setLastActiveTab] = useState<PickerTab>(readLastPickerTab);
  const keyboardHeight = useBrowserKeyboardHeight();
  const nativeInput = useNativeComposerInput({
    draftKey,
    editorRef: editableRef,
    onInsert: insertEmoji,
    onGif: pickGif,
    onTab: persistLastTab,
  });
  const activeTab = isNativeShell() ? nativeInput.activeTab : webActiveTab;

  // Sending never waits on attachment upload completion (matches Discord/
  // Telegram/Slack/WhatsApp) — only a failed draft doesn't count, since it's
  // left out of the send and stays in the composer for the user to handle.
  const canSend = hasContent || uploads.drafts.some((draft) => draft.status !== 'error');

  useLayoutEffect(() => {
    if (intent || (composer.autoFocus && !isCompact)) editableRef.current?.focus();
  }, [composer.autoFocus, intent, isCompact]);

  // Scrolling the history should dismiss the on-screen keyboard, same as any native chat
  // app — the timeline bumps blurComposerToken on scroll (see MessageTimeline.tsx). Skips
  // the token's initial value so mounting doesn't blur a composer that just autofocused.
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    editableRef.current?.blur();
    closePicker();
    // The blur token represents a user gesture, never a layout-induced scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blurComposerToken]);

  const handleSend = useCallback(() => {
    const markdown = editableRef.current?.markdown().trim() ?? '';
    if (!canSend) return;
    const input = {
      markdown,
      ...(intent ? { replyToMessageId: intent.messageId } : {}),
      ...(intent?.quoteText ? { quoteText: intent.quoteText } : {}),
    };
    const nonce = randomId();
    const drafts = uploads.commit(nonce);
    if (drafts.length) {
      onSend(input, {
        nonce,
        drafts,
        watchCommitted: uploads.watchCommitted,
        uncommit: uploads.uncommit,
        releaseCommitted: uploads.releaseCommitted,
      });
    } else {
      onSend(input);
    }
    editableRef.current?.clear();
    clearDraft();
    setIntent(null);
    // Sending keeps the active input surface, including an open emoji panel.
    if (!activeTab) editableRef.current?.focus();
  }, [canSend, uploads, onSend, intent, clearDraft, setIntent, activeTab]);

  function insertEmoji(emoji: string) {
    editableRef.current?.insertText(emoji);
  }

  function pickGif(gif: Pick<GifResult, 'title' | 'url'>) {
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

  // Desktop only — there's no software keyboard to fight with here, so plain click
  // semantics (and the normal focus-shift that comes with them) are fine.
  function openPicker(tab: PickerTab) {
    setActiveTab((current) => {
      const next = current === tab ? null : tab;
      if (next) persistLastTab(next);
      return next;
    });
  }

  function closePicker() {
    if (isNativeShell()) {
      nativeInput.close();
      return;
    }
    setActiveTab(null);
    editableRef.current?.releaseInput();
  }

  const onEscape = useCallback(() => {
    if (activeTab) closePicker();
    else setIntent(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, setIntent]);

  // Runs on pointerdown, ahead of the browser's own focus handling — tapping the text
  // area while the panel is open lets the browser's normal tap-to-focus take over and
  // swap straight back to the real keyboard, not reopen it with the panel still showing.
  function handleEditorPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!isCompact || !activeTab) return;
    if (isNativeShell()) {
      event.preventDefault();
      nativeInput.keyboard({ x: event.clientX, y: event.clientY });
      return;
    }
    closePicker();
    // Don't rely on the browser's own tap-to-focus following this pointerdown — on a
    // real device inside the WebView that isn't reliable enough to bring the keyboard
    // back on its own; ask for it explicitly, same as the toggle button does. Using the
    // tap's own coordinates (not a plain focus()) keeps the caret where the user tapped
    // instead of resetting to offset 0.
    editableRef.current?.focusAtPoint(event.clientX, event.clientY);
  }

  // Pointerdown preserves the editor selection; click also works with assistive input.
  function toggleCompactPicker() {
    if (isNativeShell()) {
      if (activeTab) nativeInput.keyboard();
      else nativeInput.open(lastActiveTab);
      return;
    }
    if (activeTab !== null) {
      setActiveTab(null);
      editableRef.current?.resumeInput();
      return;
    }
    const tab = lastActiveTab;
    setActiveTab(tab);
    persistLastTab(tab);
    editableRef.current?.suspendInput();
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
        aria-label={activeTab !== null ? 'Клавіатура' : 'Емодзі, GIF і стікери'}
        aria-pressed={activeTab !== null}
        onPointerDown={(event) => event.preventDefault()}
        onClick={toggleCompactPicker}
      >
        {activeTab !== null ? (
          <KeyboardIcon size={22} />
        ) : (
          <SmileyIcon size={22} weight="regular" />
        )}
      </IconButton>
    </div>
  );

  const slot = useMemo<ComposerEditorSlotProps>(
    () => ({
      editorRef: editableRef,
      draftKey,
      initialDraft,
      className: styles.editable,
      ariaLabel: composer.ariaLabel,
      placeholder: composer.placeholder,
      onChange: syncHasContent,
      onSubmit: handleSend,
      onEscape,
      onPasteFiles: uploads.addFiles,
      suggestionsHost,
    }),
    [
      draftKey,
      initialDraft,
      styles.editable,
      composer.ariaLabel,
      composer.placeholder,
      syncHasContent,
      handleSend,
      onEscape,
      uploads.addFiles,
      suggestionsHost,
    ],
  );

  return (
    <div className={styles.root}>
      <div ref={setSuggestionsHost} className={styles.suggestions} />
      <div className={styles.shell} ref={bindTarget}>
        {overlay}
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          onChange={(event) => {
            uploads.addFiles(Array.from(event.target.files ?? []));
            event.target.value = '';
          }}
        />
        <span className={styles.mobileOnly}>
          <IconButton
            size={36}
            className={styles.toolbarButton}
            aria-label="Додати файл"
            disabled={!uploads.policy}
            onClick={() => fileInput.current?.click()}
          >
            <PaperclipIcon size={22} />
          </IconButton>
        </span>
        <MessageInputSurface
          context={
            (intent || uploads.drafts.length > 0 || uploads.policyError) && (
              <>
                <AttachmentDrafts
                  drafts={uploads.drafts}
                  onRemove={uploads.remove}
                  onRetry={uploads.retry}
                  onDescribe={uploads.describe}
                />
                {uploads.policyError && (
                  <div role="alert">
                    Не вдалося завантажити ліміти файлів.{' '}
                    <Button type="link" size="small" onClick={uploads.reloadPolicy}>
                      Повторити
                    </Button>
                  </div>
                )}
                {intent && (
                  <div className={styles.reply}>
                    <ReplyExcerpt
                      title={
                        intent.quoteText ? 'Цитата' : `Відповідь для ${replyAuthor ?? 'учасника'}`
                      }
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
                )}
              </>
            )
          }
          leading={
            <span className={styles.mobileHidden}>
              <IconButton
                size={toolbarActionSize}
                className={styles.toolbarButton}
                aria-label="Додати файл"
                disabled={!uploads.policy}
                onClick={() => fileInput.current?.click()}
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
            <MessageEditorSlotProvider slot={slot}>{children}</MessageEditorSlotProvider>
          </div>
        </MessageInputSurface>
        <ComposerAction hasContent={canSend} onSend={handleSend} />
      </div>
      {isCompact && activeTab && !isNativeShell() && (
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
