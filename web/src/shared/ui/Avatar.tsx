import { Avatar as BaseAvatar, type AvatarProps as BaseAvatarProps } from '@ap-education/ui';

import { resolveImageUrl } from '../lib/resolve-image-url';

interface AvatarProps extends Omit<BaseAvatarProps, 'src'> {
  /** Storage key or absolute URL. */
  path: string | null | undefined;
}

export function Avatar({ path, ...rest }: AvatarProps) {
  return <BaseAvatar src={resolveImageUrl(path)} {...rest} />;
}
