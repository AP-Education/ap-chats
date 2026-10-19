import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { Input } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { isGifSearchConfigured } from '../../../gifs/klipy-api';
import type { Gif } from '../../../gifs/types';
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
  onPick: (gif: Gif) => void;
}

export function GifTab({ onPick }: GifTabProps) {
  const { styles } = useStyles();
  const { t } = useTranslation('messaging');
  const [query, setQuery] = useState('');
  const configured = isGifSearchConfigured();
  const search = useGifSearch(query, configured);

  if (!configured) {
    return <div className={styles.unavailable}>{t(($) => $.picker.gifUnavailable)}</div>;
  }

  return (
    <div className={styles.root}>
      <Input
        autoFocus
        allowClear
        prefix={<MagnifyingGlassIcon size={16} />}
        // KLIPY's terms require its name as the search placeholder.
        placeholder={t(($) => $.picker.gifPlaceholder)}
        aria-label={t(($) => $.picker.gifSearch)}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <GifResults search={search} onPick={onPick} />
    </div>
  );
}
