import { postToNative } from '@ap-education/shell-sdk';
import { useEffect, useId } from 'react';

import { shellCapability } from '@/shared/lib/shell-capability';

const reportsToShell = shellCapability('ReloadGuard') >= 1;

/**
 * Tells the native shell whether this part of the page holds work that reloading it would lose,
 * such as files going up or a recording. The shell holds back an urgent over-the-air update
 * until no part is busy (docs/adr/0008-app-updates.md). Each mounted caller is its own source.
 */
export function useReloadGuard(name: string, busy: boolean) {
  const source = `${name}:${useId()}`;

  useEffect(() => {
    if (!reportsToShell) return;
    postToNative({ type: 'updates/busy', source, busy });
  }, [source, busy]);

  useEffect(() => {
    if (!reportsToShell) return;
    return () => postToNative({ type: 'updates/busy', source, busy: false });
  }, [source]);
}
