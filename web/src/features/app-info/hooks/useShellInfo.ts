import { isNativeShell, onNativeMessage, postToNative } from '@ap-education/shell-sdk';
import { useEffect, useState } from 'react';

import type { AppInfoToNativeMessage, ShellInfo } from '../types';
import { parseShellInfo } from '../utils/parse-shell-info';

/** The phone app's version and update; null in a browser or in an older app that never answers. */
export function useShellInfo(): ShellInfo | null {
  const [info, setInfo] = useState<ShellInfo | null>(null);

  useEffect(() => {
    if (!isNativeShell()) return;
    const stop = onNativeMessage((message) => {
      const next = parseShellInfo(message);
      if (next) setInfo(next);
    });
    postToNative({ type: 'shell/info-request' } satisfies AppInfoToNativeMessage);
    return stop;
  }, []);

  return info;
}
