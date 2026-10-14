import {
  ChatText,
  type Icon,
  type IconProps,
  Phone,
  UserCircle,
  UsersThree,
} from 'phosphor-react-native';
import type { ReactNode } from 'react';

// The page names Material Symbols for its tabs; Android draws the same Phosphor icons the page's
// own navigation uses.
const ICONS: Record<string, Icon> = {
  groups: UsersThree,
  forum: ChatText,
  call: Phone,
  account_circle: UserCircle,
};

export function renderTabIcon(symbol: string, props: IconProps): ReactNode {
  const TabIcon = ICONS[symbol];
  return TabIcon ? <TabIcon {...props} /> : null;
}
