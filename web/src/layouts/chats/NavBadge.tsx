import { CountBadge } from '@ap-education/ui';

export function NavBadge({ count }: { count: number }) {
  return <CountBadge count={count} label={`${count} непрочитаних`} />;
}
