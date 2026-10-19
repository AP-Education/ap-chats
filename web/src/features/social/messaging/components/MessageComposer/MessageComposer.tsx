import { isNativeShell } from '@ap-education/shell-sdk';
import { IconButton, useIsMobile } from '@ap-education/ui';
import { KeyboardIcon, PaperclipIcon, SmileyIcon, XIcon } from '@phosphor-icons/react';
import { Button } from 'antd';
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
import {
  type ComposerCommands,
  useConversationExtensions,
} from '@/features/social/conversation-scope/extensions';
import { useConversation, useConversationScope } from '@/features/social/conversation-scope/store';
import { MessageEditorSlotProvider } from '@/features/social/mentions/MessageEditorSlot';
import type {
  ComposerDraft,
  ComposerEditorApi,
  ComposerEditorSlotProps,
} from '@/features/social/mentions/types';
import { useHasCoarsePointer } from '@/shared/hooks/useHasCoarsePointer';
import { randomId } from '@/shared/lib/random-id';

import { useAttachments } from '../../attachments/useAttachments';
import { gifBlock } from '../../gifs/klipy-items';
import { withPlaceholder } from '../../gifs/linked-gif';
import type { PickedGif } from '../../gifs/types';
import { useLinkedGif } from '../../gifs/useLinkedGif';
import type { GifBlock, PendingAttachmentCommit, SendMessageCommand } from '../../types';
import { MessageInputSurface } from '../MessageInputSurface/MessageInputSurface';
import { AttachmentDrafts } from './AttachmentDrafts/AttachmentDrafts';
import { useAttachmentDrop } from './AttachmentDropZone';
import { ComposerAction } from './ComposerAction';
import { composerIntent, IntentExcerpt, type ReplyPreview } from './composerIntents';
import { DesktopPickerPopover } from './DesktopPickerPopover';
import styles from './MessageComposer.module.css';
import { PickerPanel, type PickerTab } from './picker';
import { useBrowserKeyboardHeight } from './useBrowserKeyboardHeight';
import { useComposerDraft } from './useComposerDraft';
import { useComposerSeed } from './useComposerSeed';
import { useNativeComposerInput } from './useNativeComposerInput';

const LAST_PICKER_TAB_KEY = 'ap-chats:last-picker-tab';
const PICKER_TABS: PickerTab[] = ['gif', 'sticker', 'emoji'];

function readLastPickerTab(): PickerTab {
  const stored = localStorage.getItem(LAST_PICKER_TAB_KEY);
  return (PICKER_TABS as string[]).includes(stored ?? '') ? (stored as PickerTab) : 'emoji';
}

type ComposedMessage = Omit<SendMessageCommand, 'clientNonce' | 'attachments'>;

interface MessageComposerProps {
  replyAuthor?: string;
  replyPreview?: ReplyPreview;
  onSend: (input: ComposedMessage, pending?: PendingAttachmentCommit) => void;
  /** The text-input to compose with — e.g. `<MentionEditor />` — wired via MessageEditorSlotProvider. */
  children: ReactNode;
}

export function MessageComposer({
  replyAuthor,
  replyPreview,
  onSend,
  children,
}: MessageComposerProps) {
  const { workspaceId, channelId, composer } = useConversationScope();
  const { identity } = useQueryAuth();
  const draftKey = `ap-chats:draft:${identity}:${workspaceId}:${channelId}`;
  const intent = useConversation((state) => state.intent);
  const setIntent = useConversation((state) => state.setIntent);
  const extensions = useConversationExtensions();
  const sendOptions = useMemo(
    () => extensions.flatMap((extension) => extension.sendOptions ?? []),
    [extensions],
  );
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
  const linkedGif = useLinkedGif();
  // Sends leave in the order written, though a GIF lookup may hold one back for a moment.
  const sendQueue = useRef(Promise.resolve());
  const nativeInput = useNativeComposerInput({
    draftKey,
    editorRef: editableRef,
    onInsert: insertEmoji,
    onGif: pickGif,
    onTab: persistLastTab,
  });
  const activeTab = isNativeShell() ? nativeInput.activeTab : webActiveTab;
  useComposerSeed(channelId, {
    editorRef: editableRef,
    addFiles: uploads.policy ? uploads.addFiles : undefined,
  });

  // Sending never waits on attachment upload completion (matches Discord/
  // Telegram/Slack/WhatsApp) — only a failed draft doesn't count, since it's
  // left out of the send and stays in the composer for the user to handle.
  const canSend =
    hasContent ||
    Boolean(intent && composerIntent(intent.kind).speaksForItself) ||
    uploads.drafts.some((draft) => draft.status !== 'error');

  useLayoutEffect(() => {
    if (intent || (composer.autoFocus && !isCompact)) editableRef.current?.focus();
  }, [composer.autoFocus, intent, isCompact]);

  // The timeline bumps blurComposerToken on a closing swipe (see useKeyboardSwipe). Skips
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

  const readMessage = useCallback((): ComposedMessage => {
    const draft = editableRef.current?.draft();
    const composed = { markdown: draft?.markdown.trim() ?? '', labels: draft?.labels ?? {} };
    return intent ? composerIntent(intent.kind).compose(intent, composed) : composed;
  }, [intent]);

  const clearSent = useCallback(() => {
    editableRef.current?.clear();
    clearDraft();
    setIntent(null);
  }, [clearDraft, setIntent]);

  const handleSend = useCallback(() => {
    if (!canSend) return;
    const input = readMessage();
    const nonce = randomId();
    const drafts = uploads.commit(nonce);
    const pending = drafts.length
      ? {
          nonce,
          drafts,
          watchCommitted: uploads.watchCommitted,
          uncommit: uploads.uncommit,
          releaseCommitted: uploads.releaseCommitted,
        }
      : undefined;
    sendQueue.current = sendQueue.current.then(async () => {
      const blocks = await linkedGif.blocksFor(input.markdown);
      onSend({ ...input, ...(blocks ? { blocks } : {}) }, pending);
    });

    clearSent();
    // Sending keeps the active input surface, including an open emoji panel.
    if (!activeTab) editableRef.current?.focus();
  }, [canSend, readMessage, uploads, onSend, clearSent, activeTab, linkedGif]);

  const handleDraftChange = useCallback(
    (draft: ComposerDraft) => {
      syncHasContent(draft);
      linkedGif.prefetch(draft.markdown);
    },
    [syncHasContent, linkedGif],
  );

  // Other ways to send take the draft over through these, and decide its fate themselves.
  const commands = useMemo<ComposerCommands>(
    () => ({ read: readMessage, clear: clearSent }),
    [readMessage, clearSent],
  );
  const draftState = {
    hasAttachments: uploads.drafts.length > 0,
    canWait: !intent || composerIntent(intent.kind).canWait,
  };

  function insertEmoji(emoji: string) {
    editableRef.current?.insertText(emoji);
  }

  function pickGif(gif: PickedGif) {
    sendGif(() => withPlaceholder(gifBlock(gif), gif.placeholder ?? undefined));
  }

  // A picked GIF goes out as its link with the GIF already found, as on Discord.
  function sendGif(prepare: () => Promise<GifBlock>) {
    const sentIntent = intent;
    sendQueue.current = sendQueue.current.then(async () => {
      const block = await prepare();
      const composed = { markdown: block.link, labels: {} };
      const input = sentIntent
        ? composerIntent(sentIntent.kind).compose(sentIntent, composed)
        : composed;
      onSend({ ...input, blocks: [block] });
    });
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
  function togglePicker() {
    setActiveTab((current) => (current ? null : lastActiveTab));
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

  const accessories = extensions.map(
    ({ id, ComposerAccessory }) => ComposerAccessory && <ComposerAccessory key={id} />,
  );

  // One entry point that reopens whatever tab was used last; the panel's own tabs switch.
  const pickerButtons = (
    <>
      {accessories}
      <IconButton
        size={toolbarActionSize}
        className={styles.toolbarButton}
        aria-label="Емодзі, GIF і стікери"
        aria-pressed={activeTab !== null}
        onClick={togglePicker}
      >
        <SmileyIcon size={22} weight={activeTab !== null ? 'duotone' : 'regular'} />
      </IconButton>
    </>
  );

  // Compact (phone/tablet): the same entry point, which turns into the way back to the keyboard.
  const compactToolbarButton = (
    <div className={styles.toolbarRight}>
      {accessories}
      <IconButton
        size={toolbarActionSize}
        className={styles.toolbarButton}
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
      onChange: handleDraftChange,
      onSubmit: handleSend,
      onEscape,
      onPasteFiles: uploads.addFiles,
      suggestionsHost,
    }),
    [
      draftKey,
      initialDraft,
      composer.ariaLabel,
      composer.placeholder,
      handleDraftChange,
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
        <IconButton
          size={44}
          className={`${styles.toolbarButton} ${styles.mobileAttach}`}
          aria-label="Додати файл"
          disabled={!uploads.policy}
          onClick={() => fileInput.current?.click()}
        >
          <PaperclipIcon size={22} />
        </IconButton>
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
                    <IntentExcerpt
                      intent={intent}
                      replyAuthor={replyAuthor}
                      replyPreview={replyPreview}
                    />
                    <IconButton
                      size={28}
                      aria-label={composerIntent(intent.kind).cancelLabel}
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
              <DesktopPickerPopover
                activeTab={activeTab}
                onTabChange={selectTab}
                onPickEmoji={insertEmoji}
                onPickGif={pickGif}
                onClose={closePicker}
                className={styles.toolbarRight}
              >
                {pickerButtons}
              </DesktopPickerPopover>
            )
          }
        >
          <div onPointerDownCapture={handleEditorPointerDown} style={{ display: 'contents' }}>
            <MessageEditorSlotProvider slot={slot}>{children}</MessageEditorSlotProvider>
          </div>
        </MessageInputSurface>
        <ComposerAction
          hasContent={canSend}
          onSend={handleSend}
          options={sendOptions}
          draft={draftState}
          composer={commands}
        />
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
