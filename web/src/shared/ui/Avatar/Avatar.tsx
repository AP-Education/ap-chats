import { theme } from 'antd';
import type { HTMLAttributes } from 'react';

import { Image } from '../Image/Image';
import { avatarColors } from './utils/color';
import { avatarInitials } from './utils/initials';

const SIZE_MAP: Record<'small' | 'default' | 'large', number> = {
  small: 32,
  default: 40,
  large: 48,
};

type AvatarShape = 'circle' | 'square' | 'rounded';
type AvatarSize = number | keyof typeof SIZE_MAP;

export interface AvatarProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  path: string | null;
  alt: string;
  size?: AvatarSize;
  shape?: AvatarShape;
  fit?: 'cover' | 'contain';
  lazy?: boolean;
}

// Ported from front-LMS's shared/ui/Avatar: an Image sized/shaped for avatar use.
// Without a photo it shows initials on a soft gradient, the hue derived from `alt`.
export function Avatar({
  path,
  alt,
  size = 'default',
  shape = 'square',
  fit = 'cover',
  className,
  style,
  lazy = true,
  ...rest
}: AvatarProps) {
  const { token } = theme.useToken();
  const colors = avatarColors(alt, token);
  const numericSize = typeof size === 'number' ? size : SIZE_MAP[size];

  return (
    <Image
      path={path}
      alt={alt}
      width={numericSize}
      height={numericSize}
      shape={shape}
      fit={fit}
      fallbackBackground={`linear-gradient(135deg, ${colors.from}, ${colors.to})`}
      fallbackColor={colors.initials}
      fallbackText={avatarInitials(alt)}
      className={className}
      style={{ flexShrink: 0, ...style }}
      lazy={lazy}
      {...rest}
    />
  );
}
