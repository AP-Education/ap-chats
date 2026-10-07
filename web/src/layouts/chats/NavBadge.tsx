import { CountBadge } from '@ap/ui';

export function NavBadge({ count }: { count: number }) {
  return <CountBadge count={count} label={`${count} непрочитаних`} />;
}
