import { LoadingIcon } from '@ap-education/ui';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { Input } from 'antd';
import { createStyles } from 'antd-style';
import { useEffect, useState } from 'react';

import { type GifResult, isGifSearchConfigured, searchGifs } from './gif-provider';

const SEARCH_DEBOUNCE_MS = 350;

const useStyles = createStyles(({ token, css }) => ({
  root: css`
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: 8px;
  `,
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

interface GifTabProps {
  onPick: (gif: GifResult) => void;
}

export function GifTab({ onPick }: GifTabProps) {
  const { styles } = useStyles();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GifResult[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const configured = isGifSearchConfigured();

  useEffect(() => {
    if (!configured) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setStatus('loading');
      searchGifs(query, controller.signal)
        .then((found) => {
          setResults(found);
          setStatus('idle');
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          console.error('GIF search failed', error);
          setStatus('error');
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query, configured]);

  if (!configured) {
    return (
      <div className={styles.state}>
        Пошук GIF вимкнено: додайте VITE_TENOR_API_KEY, щоб увімкнути його.
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <Input
        autoFocus
        allowClear
        prefix={<MagnifyingGlassIcon size={16} />}
        placeholder="Пошук GIF"
        aria-label="Пошук GIF"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {status === 'loading' && results.length === 0 ? (
        <div className={styles.state}>
          <LoadingIcon />
        </div>
      ) : status === 'error' ? (
        <div className={styles.state}>Не вдалося завантажити GIF. Спробуйте ще раз.</div>
      ) : results.length === 0 ? (
        <div className={styles.state}>Нічого не знайдено.</div>
      ) : (
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
      )}
    </div>
  );
}
