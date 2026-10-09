import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { Input } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import { type GifResult, isGifSearchConfigured } from './gif-provider';
import { GifResults } from './GifResults';
import { useGifSearch } from './useGifSearch';

const useStyles = createStyles(({ token, css }) => ({
  root: css`
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: 8px;
  `,
  unavailable: css`
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
  const configured = isGifSearchConfigured();
  const search = useGifSearch(query, configured);

  if (!configured) {
    return (
      <div className={styles.unavailable}>
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
      <GifResults search={search} onPick={onPick} />
    </div>
  );
}
