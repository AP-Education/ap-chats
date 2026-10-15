import { createStyles } from 'antd-style';
import { useEffect, useRef } from 'react';

import type { Gif } from '../../../gifs/types';
import { gifColumns } from './gif-columns';
import { GifGridSkeleton } from './GifGridSkeleton';
import type { GifSearch } from './useGifSearch';

const COLUMNS = 2;

const useStyles = createStyles(({ token, css }) => ({
  scroll: css`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  `,
  columns: css`
    display: flex;
    align-items: flex-start;
    gap: 6px;
  `,
  column: css`
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  `,
  tile: css`
    display: block;
    width: 100%;
    padding: 0;
    border: none;
    border-radius: ${token.borderRadius}px;
    overflow: hidden;
    cursor: pointer;
    background: ${token.colorFillTertiary} center / cover no-repeat;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
  `,
  state: css`
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    min-height: 120px;
    color: ${token.colorTextTertiary};
    font-size: ${token.fontSizeSM}px;
    text-align: center;
    padding: 0 12px;
  `,
}));

interface GifResultsProps {
  search: GifSearch;
  onPick: (gif: Gif) => void;
}

export function GifResults({ search, onPick }: GifResultsProps) {
  const { styles } = useStyles();
  const { status, gifs, hasMore, loadMore } = search;
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const end = endRef.current;
    if (!end || !hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) loadMore();
      },
      { root: scrollRef.current, rootMargin: '0px 0px 240px 0px' },
    );
    observer.observe(end);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  if (status === 'searching' && !gifs.length) return <GifGridSkeleton />;

  if (status === 'failed') {
    return <div className={styles.state}>Не вдалося завантажити GIF. Спробуйте ще раз.</div>;
  }

  if (!gifs.length) return <div className={styles.state}>Нічого не знайдено.</div>;

  return (
    <div ref={scrollRef} className={styles.scroll}>
      <div className={styles.columns}>
        {gifColumns(gifs, COLUMNS).map((column, index) => (
          <div key={index} className={styles.column}>
            {column.map((gif, row) => (
              <button
                // A trending feed can repeat a GIF across pages; rows only ever append.
                key={`${row}:${gif.slug}`}
                type="button"
                className={styles.tile}
                style={{
                  aspectRatio: `${gif.preview.width} / ${gif.preview.height}`,
                  backgroundImage: gif.placeholder ? `url("${gif.placeholder}")` : undefined,
                }}
                aria-label={gif.title || 'GIF'}
                onClick={() => onPick(gif)}
              >
                <img src={gif.preview.url} alt="" loading="lazy" decoding="async" />
              </button>
            ))}
          </div>
        ))}
      </div>
      <div ref={endRef} aria-hidden />
    </div>
  );
}
