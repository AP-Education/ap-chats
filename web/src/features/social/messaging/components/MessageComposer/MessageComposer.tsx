import { GifIcon, PaperclipIcon, SmileyIcon, StickerIcon, XIcon } from '@phosphor-icons/react';
import { Popover, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import { type KeyboardEvent, useLayoutEffect, useRef, useState } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useConversation } from '@/features/social/conversation/store';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { IconButton } from '@/shared/ui/IconButton';

import type { SendMessageInput } from '../../types';
import { ComposerAction } from './ComposerAction';
import { EmojiPopoverContent } from './EmojiPopoverContent';
import { MockPopoverContent } from './MockPopoverContent';

const useStyles = createStyles(({ token, css }) => ({
  shell: css`
    flex-shrink: 0;
    display: flex;
    align-items: flex-end;
    gap: 10px;
    padding: 0 ${token.paddingLG}px ${token.paddingSM}px;

    @media (max-width: ${token.screenMD}px) {
      gap: 8px;
      padding: 0 16px calc(8px + env(safe-area-inset-bottom, 0px));
    }
  `,
  pill: css`
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: flex-end;
    gap: 5px;
    padding: 7px 9px;
    border-radius: 12px;
    background: ${token.colorBgContainer};
    border: 1px solid ${token.colorBorder};
    box-shadow: 0 2px 8px ${token.colorFillQuaternary};

    &:focus-within {
      border-color: ${token.colorPrimaryBorder};
    }

    @media (max-width: ${token.screenMD}px) {
      min-height: 52px;
      gap: 4px;
      padding: 4px 4px 4px 12px;
      border-color: ${token.colorBorderSecondary};
      border-radius: 14px;
      background: ${token.colorFillQuaternary};
      box-shadow: none;
    }
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
      height: 52px;
      flex-shrink: 0;
    }
  `,
  toolbarRight: css`
    display: flex;
    align-items: center;
    gap: 1px;
    flex-shrink: 0;
  `,
  editable: css`
    flex: 1;
    min-width: 0;
    min-height: 40px;
    max-height: 200px;
    overflow-y: auto;
    padding: 9px 4px 8px;
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
      color: ${token.colorTextQuaternary};
      pointer-events: none;
    }

    @media (max-width: ${token.screenMD}px) {
      min-height: 40px;
      max-height: 160px;
      padding: 9px 0 8px;

      &:empty::before {
        content: attr(data-mobile-placeholder);
      }
    }
  `,
  toolbarButton: css`
    color: ${token.colorTextSecondary};
  `,
  toolbarButtonActive: css`
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimary};
  `,
  composerBody: css`
    flex: 1;
    min-width: 0;
  `,
  reply: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
    margin: 3px 3px 0;
    padding: 5px 8px;
    border-left: 3px solid ${token.colorPrimary};
    border-radius: 5px;
    background: ${token.colorPrimaryBg};
    color: ${token.colorTextSecondary};
    font-size: 12px;
  `,
  replyLabel: css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
}));

interface MessageComposerProps {
  workspaceId: string;
  channelId: string;
  channelName: string;
  replyLabel?: string;
  onSend: (input: Omit<SendMessageInput, 'clientNonce'>) => void;
}

// A Discord-shaped composer: a growing contentEditable box (capped height,
// its own scroll) instead of a plain <textarea>, so it's ready for rich
// content later. The toolbar (attach/emoji/gif/sticker) stays pinned to the
// pill's top edge as the box grows — only the text scrolls internally.
// Emoji insertion is real; gif/sticker are mock previews since neither has a
// backend yet.
export function MessageComposer({
  workspaceId,
  channelId,
  channelName,
  replyLabel,
  onSend,
}: MessageComposerProps) {
  const { styles, cx } = useStyles();
  const { identity } = useQueryAuth();
  const draftKey = `ap-chats:draft:${identity}:${workspaceId}:${channelId}`;
  const intent = useConversation((state) => state.intent);
  const setIntent = useConversation((state) => state.setIntent);
  const isMobile = useIsMobile();
  const toolbarActionSize = isMobile ? 44 : 38;
  const editableRef = useRef<HTMLDivElement>(null);
  const [contentState, setContentState] = useState(() => ({
    draftKey,
    hasContent: Boolean(localStorage.getItem(draftKey)?.trim()),
  }));
  const hasContent =
    contentState.draftKey === draftKey
      ? contentState.hasContent
      : Boolean(localStorage.getItem(draftKey)?.trim());
  const [activeAction, setActiveAction] = useState<'emoji' | 'gif' | 'sticker' | null>(null);

  useLayoutEffect(() => {
    const draft = localStorage.getItem(draftKey) ?? '';
    if (editableRef.current) editableRef.current.textContent = draft;
  }, [draftKey]);

  useLayoutEffect(() => {
    if (intent) editableRef.current?.focus();
  }, [intent]);

  function syncHasContent() {
    const el = editableRef.current;
    if (!el) return;
    if (el.textContent === '') el.innerHTML = '';
    const draft = el.innerText;
    if (draft) localStorage.setItem(draftKey, draft);
    else localStorage.removeItem(draftKey);
    setContentState({ draftKey, hasContent: draft.trim().length > 0 });
  }

  function handleSend() {
    const el = editableRef.current;
    const markdown = el?.innerText.trim();
    if (!el || !markdown) return;
    onSend({
      markdown,
      ...(intent ? { replyToMessageId: intent.messageId } : {}),
      ...(intent?.quoteText ? { quoteText: intent.quoteText } : {}),
    });
    el.innerHTML = '';
    localStorage.removeItem(draftKey);
    setContentState({ draftKey, hasContent: false });
    setIntent(null);
    el.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && intent) {
      setIntent(null);
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      handleSend();
    }
  }

  function insertAtCaret(text: string) {
    const el = editableRef.current;
    if (!el) return;
    el.focus();
    const selection = window.getSelection();
    const range =
      selection && selection.rangeCount > 0 && el.contains(selection.anchorNode)
        ? selection.getRangeAt(0)
        : (() => {
            const fallback = document.createRange();
            fallback.selectNodeContents(el);
            fallback.collapse(false);
            return fallback;
          })();

    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
    syncHasContent();
  }

  return (
    <div className={styles.shell}>
      <span className={styles.mobileOnly}>
        <Tooltip title="Незабаром">
          <IconButton size={44} className={styles.toolbarButton} aria-label="Додати файл" disabled>
            <PaperclipIcon size={22} />
          </IconButton>
        </Tooltip>
      </span>
      <div className={styles.pill}>
        <span className={styles.mobileHidden}>
          <Tooltip title="Незабаром">
            <IconButton
              size={toolbarActionSize}
              className={styles.toolbarButton}
              aria-label="Додати файл"
              disabled
            >
              <PaperclipIcon size={22} />
            </IconButton>
          </Tooltip>
        </span>

        <div className={styles.composerBody}>
          {intent && (
            <div className={styles.reply}>
              <span className={styles.replyLabel}>
                {intent.quoteText
                  ? `Цитата: ${intent.quoteText}`
                  : `Відповідь: ${replyLabel ?? 'повідомлення'}`}
              </span>
              <IconButton
                size={24}
                aria-label="Скасувати відповідь"
                onClick={() => setIntent(null)}
              >
                <XIcon size={16} />
              </IconButton>
            </div>
          )}
          <div
            ref={editableRef}
            className={styles.editable}
            contentEditable="plaintext-only"
            role="textbox"
            aria-multiline="true"
            aria-label={`Написати в #${channelName}`}
            data-placeholder={`Написати в #${channelName}`}
            data-mobile-placeholder="Повідомлення"
            onInput={syncHasContent}
            onKeyDown={handleKeyDown}
            onPaste={(event) => {
              event.preventDefault();
              insertAtCaret(event.clipboardData.getData('text/plain'));
            }}
          />
        </div>

        <div className={styles.toolbarRight}>
          <Popover
            trigger="click"
            placement="topRight"
            onOpenChange={(open) => setActiveAction(open ? 'emoji' : null)}
            content={<EmojiPopoverContent onPick={insertAtCaret} />}
          >
            <IconButton
              size={toolbarActionSize}
              className={cx(
                styles.toolbarButton,
                activeAction === 'emoji' && styles.toolbarButtonActive,
              )}
              aria-label="Емодзі"
              aria-pressed={activeAction === 'emoji'}
            >
              <SmileyIcon size={22} weight={activeAction === 'emoji' ? 'duotone' : 'regular'} />
            </IconButton>
          </Popover>
          <span className={styles.mobileHidden}>
            <Popover
              trigger="click"
              placement="topRight"
              onOpenChange={(open) => setActiveAction(open ? 'gif' : null)}
              content={
                <MockPopoverContent
                  icon={<GifIcon size={16} />}
                  title="GIF"
                  description="Пошук GIF з’явиться незабаром."
                />
              }
            >
              <IconButton
                size={toolbarActionSize}
                className={cx(
                  styles.toolbarButton,
                  activeAction === 'gif' && styles.toolbarButtonActive,
                )}
                aria-label="GIF"
                aria-pressed={activeAction === 'gif'}
              >
                <GifIcon size={22} weight={activeAction === 'gif' ? 'duotone' : 'regular'} />
              </IconButton>
            </Popover>
          </span>
          <span className={styles.mobileHidden}>
            <Popover
              trigger="click"
              placement="topRight"
              onOpenChange={(open) => setActiveAction(open ? 'sticker' : null)}
              content={
                <MockPopoverContent
                  icon={<StickerIcon size={16} />}
                  title="Стікери"
                  description="Набори стікерів з’являться незабаром."
                />
              }
            >
              <IconButton
                size={toolbarActionSize}
                className={cx(
                  styles.toolbarButton,
                  activeAction === 'sticker' && styles.toolbarButtonActive,
                )}
                aria-label="Стікери"
                aria-pressed={activeAction === 'sticker'}
              >
                <StickerIcon
                  size={22}
                  weight={activeAction === 'sticker' ? 'duotone' : 'regular'}
                />
              </IconButton>
            </Popover>
          </span>
        </div>
      </div>
      <ComposerAction hasContent={hasContent} onSend={handleSend} />
    </div>
  );
}
