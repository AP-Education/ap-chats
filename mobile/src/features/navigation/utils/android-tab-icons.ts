import type { ImageSourcePropType } from 'react-native';

import accountCircle from '../../../../assets/tab-icons/account_circle.svg';
import accountCircleFill from '../../../../assets/tab-icons/account_circle-fill.svg';
import call from '../../../../assets/tab-icons/call.svg';
import callFill from '../../../../assets/tab-icons/call-fill.svg';
import forum from '../../../../assets/tab-icons/forum.svg';
import forumFill from '../../../../assets/tab-icons/forum-fill.svg';
import groups from '../../../../assets/tab-icons/groups.svg';
import groupsFill from '../../../../assets/tab-icons/groups-fill.svg';

interface TabIconPair {
  outline: ImageSourcePropType;
  filled: ImageSourcePropType;
}

// Material's bottom navigation draws images, not symbol names, so every symbol the page may
// name for a tab ships with the app (Material Symbols, rounded).
const ICONS: Record<string, TabIconPair> = {
  groups: { outline: groups, filled: groupsFill },
  forum: { outline: forum, filled: forumFill },
  call: { outline: call, filled: callFill },
  account_circle: { outline: accountCircle, filled: accountCircleFill },
};

/** The bundled Material Symbol for a tab, filled while the tab is selected. */
export function androidTabIcon(symbol: string, focused: boolean): ImageSourcePropType | undefined {
  const pair = ICONS[symbol];
  if (!pair) return undefined;
  return focused ? pair.filled : pair.outline;
}
