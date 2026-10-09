import { createStyles } from 'antd-style';

import type { GifResult } from './gif-provider';
import { GifGridSkeleton } from './GifGridSkeleton';
import type { GifSearch } from './useGifSearch';

const useStyles = createStyles(({ token, css }) => ({
  grid: css`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  `,
  tile: css`
    display: block;
    width: 100%;
    height: 100%;
    aspect-ratio: 1;
    padding: 0;
    border: none;
    border-radius: ${token.borderRadius}px;
    overflow: hidden;
    cursor: pointer;
    background: ${token.colorFillTertiary};

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
  onPick: (gif: GifResult) => void;
}

export function GifResults({ search, onPick }: GifResultsProps) {
  const { styles } = useStyles();
  const { status, results } = search;

  // Earlier results stay on screen while the next query runs.
  if (status === 'searching' && !results.length) return <GifGridSkeleton />;

  if (status === 'failed') {
    return <div className={styles.state}>Не вдалося завантажити GIF. Спробуйте ще раз.</div>;
  }

  if (!results.length) return <div className={styles.state}>Нічого не знайдено.</div>;

  return (
    <div className={styles.grid}>
      {results.map((gif) => (
        <button
          key={gif.id}
          type="button"
          className={styles.tile}
          aria-label={gif.title || 'GIF'}
          onClick={() => onPick(gif)}
        >
          <img src={gif.previewUrl} alt={gif.title} loading="lazy" />
        </button>
      ))}
    </div>
  );
}
