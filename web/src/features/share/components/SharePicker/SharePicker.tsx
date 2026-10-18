import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { Input } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import { BottomSheet } from '@/shared/ui/BottomSheet';

import { useShareTargets } from '../../hooks/useShareTargets';
import { matchingTargets, type ShareTarget } from '../../share-targets';
import { ShareTargetList } from './ShareTargetList';

const SHEET_HEIGHT = 'min(640px, 85dvh)';

const useStyles = createStyles(({ token, css }) => ({
  title: css`
    margin: 0 0 12px;
    font-size: ${token.fontSizeLG}px;
    font-weight: 600;
    text-align: center;
  `,
}));

interface SharePickerProps {
  open: boolean;
  onPick: (target: ShareTarget) => void;
  onClose: () => void;
}

/** Where to send what another app shared: a person or a channel, found by name. */
export function SharePicker({ open, onPick, onClose }: SharePickerProps) {
  const { styles } = useStyles();
  const [query, setQuery] = useState('');
  const { targets, isLoading } = useShareTargets();

  return (
    <BottomSheet open={open} onClose={onClose} aria-label="Кому надіслати" height={SHEET_HEIGHT}>
      <h3 className={styles.title}>Кому надіслати</h3>
      <Input
        allowClear
        prefix={<MagnifyingGlassIcon size={16} />}
        placeholder="Пошук"
        aria-label="Пошук розмови"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <ShareTargetList
        targets={matchingTargets(targets, query)}
        isLoading={isLoading}
        onPick={onPick}
      />
    </BottomSheet>
  );
}
