import { ClockCounterClockwiseIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Input } from 'antd';
import { createStyles } from 'antd-style';
import { useMemo, useRef, useState } from 'react';

import {
  EMOJI_CATEGORIES,
  type EmojiCategory,
  type EmojiItem,
  FREQUENT_CATEGORY_ID,
  readFrequentEmojis,
  recordFrequentEmoji,
  searchEmojis,
} from './emoji-data';

const COLUMNS = 8;
const GRID_ROW_HEIGHT = 44;
const HEADER_ROW_HEIGHT = 26;
const EMOJI_FONT_SIZE = 26;

type Row =
  | { type: 'header'; categoryId: string; label: string }
  | { type: 'grid'; categoryId: string; items: EmojiItem[] };

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function buildRows(frequent: EmojiItem[]): Row[] {
  const rows: Row[] = [];
  if (frequent.length > 0) {
    rows.push({ type: 'header', categoryId: FREQUENT_CATEGORY_ID, label: 'Часто використовувані' });
    chunk(frequent, COLUMNS).forEach((items) =>
      rows.push({ type: 'grid', categoryId: FREQUENT_CATEGORY_ID, items }),
    );
  }
  EMOJI_CATEGORIES.forEach((category) => {
    rows.push({ type: 'header', categoryId: category.id, label: category.label });
    chunk(category.items, COLUMNS).forEach((items) =>
      rows.push({ type: 'grid', categoryId: category.id, items }),
    );
  });
  return rows;
}

const useStyles = createStyles(({ token, css }) => ({
  root: css`
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: 6px;
  `,
  nav: css`
    display: flex;
    gap: 2px;
    flex-shrink: 0;
    overflow-x: auto;
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }
  `,
  navButton: css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    flex-shrink: 0;
    border: none;
    border-radius: ${token.borderRadius}px;
    background: transparent;
    color: ${token.colorTextTertiary};
    cursor: pointer;

    &:hover {
      background: ${token.colorFillTertiary};
    }
  `,
  navButtonActive: css`
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimaryTextActive};
  `,
  scroller: css`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  `,
  sectionHeader: css`
    display: flex;
    align-items: center;
    height: 100%;
    padding: 0 2px;
    font-size: ${token.fontSizeSM}px;
    font-weight: 600;
    color: ${token.colorTextTertiary};
    text-transform: uppercase;
    letter-spacing: 0.02em;
  `,
  row: css`
    display: grid;
    grid-template-columns: repeat(${COLUMNS}, 1fr);
    height: 100%;
  `,
  emojiButton: css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    font-size: ${EMOJI_FONT_SIZE}px;
    line-height: 1;
    border: none;
    background: transparent;
    border-radius: ${token.borderRadius}px;
    cursor: pointer;

    &:hover {
      background: ${token.colorFillTertiary};
    }
  `,
  empty: css`
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    color: ${token.colorTextTertiary};
    font-size: ${token.fontSizeSM}px;
  `,
}));

interface EmojiTabProps {
  onPick: (emoji: string) => void;
}

export function EmojiTab({ onPick }: EmojiTabProps) {
  const { styles, cx } = useStyles();
  const [query, setQuery] = useState('');
  const [frequent, setFrequent] = useState<EmojiItem[]>(() => readFrequentEmojis());
  const scrollerRef = useRef<HTMLDivElement>(null);

  const rows = useMemo<Row[]>(() => {
    const trimmed = query.trim();
    if (trimmed) {
      const matches = searchEmojis(trimmed);
      if (matches.length === 0) return [];
      return chunk(matches, COLUMNS).map((items) => ({
        type: 'grid',
        categoryId: 'search',
        items,
      }));
    }
    return buildRows(frequent);
  }, [query, frequent]);

  const categoryStartIndex = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((row, index) => {
      if (row.type === 'header' && !map.has(row.categoryId)) map.set(row.categoryId, index);
    });
    return map;
  }, [rows]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollerRef.current,
    estimateSize: (index) => (rows[index]!.type === 'header' ? HEADER_ROW_HEIGHT : GRID_ROW_HEIGHT),
    overscan: 6,
  });

  function pick(item: EmojiItem) {
    recordFrequentEmoji(item.id);
    setFrequent(readFrequentEmojis());
    onPick(item.native);
  }

  function jumpToCategory(categoryId: string) {
    const index = categoryStartIndex.get(categoryId);
    if (index !== undefined) virtualizer.scrollToIndex(index, { align: 'start' });
  }

  const virtualRows = virtualizer.getVirtualItems();
  const activeCategoryId =
    !query.trim() && virtualRows.length > 0 ? rows[virtualRows[0]!.index]!.categoryId : null;
  const navCategories: { id: string; icon: EmojiCategory['icon'] }[] = [
    ...(frequent.length > 0 ? [{ id: FREQUENT_CATEGORY_ID, icon: ClockCounterClockwiseIcon }] : []),
    ...EMOJI_CATEGORIES,
  ];

  return (
    <div className={styles.root}>
      <Input
        allowClear
        prefix={<MagnifyingGlassIcon size={16} />}
        placeholder="Пошук емодзі"
        aria-label="Пошук емодзі"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {!query.trim() && (
        <div className={styles.nav}>
          {navCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={cx(
                styles.navButton,
                activeCategoryId === category.id && styles.navButtonActive,
              )}
              aria-label={category.id}
              onClick={() => jumpToCategory(category.id)}
            >
              <category.icon size={18} />
            </button>
          ))}
        </div>
      )}
      {rows.length === 0 ? (
        <div className={styles.empty}>Нічого не знайдено.</div>
      ) : (
        <div ref={scrollerRef} className={styles.scroller}>
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualRows.map((virtualRow) => {
              const row = rows[virtualRow.index]!;
              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: virtualRow.size,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {row.type === 'header' ? (
                    <div className={styles.sectionHeader}>{row.label}</div>
                  ) : (
                    <div className={styles.row}>
                      {row.items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={styles.emojiButton}
                          title={item.name}
                          aria-label={item.name}
                          onClick={() => pick(item)}
                        >
                          {item.native}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
