import { GifIcon, PaperclipIcon, SmileyIcon, StickerIcon, XIcon } from '@phosphor-icons/react';
import { Popover, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useConversation, useConversationScope } from '@/features/social/conversation/store';
import {
  MentionEditor,
  type MentionEditorHandle,
} from '@/features/social/mentions/components/MentionEditor/MentionEditor';
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
  replyLabel?: string;
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

export function MessageComposer({ replyLabel, onSend }: MessageComposerProps) {
  const { styles, cx } = useStyles();
  const { workspaceId, channelId, composer } = useConversationScope();
  const { identity } = useQueryAuth();
  const draftKey = `ap-chats:draft:${identity}:${workspaceId}:${channelId}`;
  const intent = useConversation((state) => state.intent);
  const setIntent = useConversation((state) => state.setIntent);
  const isMobile = useIsMobile();
  const toolbarActionSize = isMobile ? 44 : 38;
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
  const [activeAction, setActiveAction] = useState<'emoji' | 'gif' | 'sticker' | null>(null);

  useLayoutEffect(() => {
    if (intent || (composer.autoFocus && !isMobile)) editableRef.current?.focus();
  }, [composer.autoFocus, intent, isMobile]);

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
    editableRef.current?.focus();
  }

  function insertAtCaret(text: string) {
    editableRef.current?.insertText(text);
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
          <MentionEditor
            key={draftKey}
            editorRef={editableRef}
            initialDraft={initialDraft}
            className={styles.editable}
            ariaLabel={composer.ariaLabel}
            placeholder={composer.placeholder}
            onChange={syncHasContent}
            onSubmit={handleSend}
            onEscape={() => setIntent(null)}
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
