import type { HTMLAttributes } from 'react';

import { getAvatarColor } from './avatar-color';
import { Image } from './Image';

const SIZE_MAP: Record<'small' | 'default' | 'large', number> = {
  small: 32,
  default: 40,
  large: 48,
};

type AvatarShape = 'circle' | 'square' | 'rounded';
type AvatarSize = number | keyof typeof SIZE_MAP;

export interface AvatarProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** A fetchable URL; the application resolves its own storage keys. */
  src: string | null | undefined;
  alt: string;
  size?: AvatarSize;
  shape?: AvatarShape;
  fit?: 'cover' | 'contain';
  lazy?: boolean;
}

// Ported from front-LMS's shared/ui/Avatar: an Image sized/shaped for avatar use,
// with a deterministic fallback color derived from `alt`.
export function Avatar({
  src,
  alt,
  size = 'default',
  shape = 'square',
  fit = 'cover',
  className,
  style,
  lazy = true,
  ...rest
}: AvatarProps) {
  const color = getAvatarColor(alt);
  const numericSize = typeof size === 'number' ? size : SIZE_MAP[size];
  const fallbackText = alt ? alt.trim().slice(0, 2).toUpperCase() : '?';

  return (
    <Image
      src={src}
      alt={alt}
      width={numericSize}
      height={numericSize}
      shape={shape}
      fit={fit}
      backgroundColor={color.bg}
      textColor={color.text}
      fallbackText={fallbackText}
      className={className}
      style={{ flexShrink: 0, ...style }}
      lazy={lazy}
      {...rest}
    />
  );
}
