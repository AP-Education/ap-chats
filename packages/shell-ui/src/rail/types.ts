import type { AppIcon } from '@ap/shell-sdk';

export interface RailApp {
  id: string;
  label: string;
  icon: AppIcon;
  href: string;
  active: boolean;
  badge: number;
}
