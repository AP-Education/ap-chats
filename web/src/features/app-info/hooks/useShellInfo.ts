import { onNativeMessage, postToNative } from '@ap-education/shell-sdk';
import { useEffect, useState } from 'react';

import { shellCapability } from '@/shared/lib/shell-capability';

import type { AppInfoToNativeMessage, ShellInfo } from '../types';
import { parseShellInfo } from '../utils/parse-shell-info';

/** The phone app's version and update; null in a browser and in an app from before ApAppShellInfo/1. */
export function useShellInfo(): ShellInfo | null {
  const [info, setInfo] = useState<ShellInfo | null>(null);

  useEffect(() => {
    // Only a shell that announces it answers; asking any other one would go unanswered.
    if (shellCapability('ShellInfo') < 1) return;
    const stop = onNativeMessage((message) => {
      const next = parseShellInfo(message);
      if (next) setInfo(next);
    });
    postToNative({ type: 'shell/info-request' } satisfies AppInfoToNativeMessage);
    return stop;
  }, []);

  return info;
}
