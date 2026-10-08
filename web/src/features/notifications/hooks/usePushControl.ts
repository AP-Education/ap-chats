import { getAppShell } from '@ap-education/shell-sdk';

import { useBrowserPushControl } from './useBrowserPushControl';
import { useNativePushControl } from './useNativePushControl';

// The shell never changes at runtime, so picking the adapter once keeps the hook order stable.
export const usePushControl =
  getAppShell().kind === 'browser' ? useBrowserPushControl : useNativePushControl;
