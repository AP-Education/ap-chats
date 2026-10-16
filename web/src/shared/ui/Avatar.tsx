import {
  AiCosmos,
  AiSpark,
  Avatar as BaseAvatar,
  type AvatarProps as BaseAvatarProps,
} from '@ap-education/ui';

import { resolveImageUrl } from '../lib/resolve-image-url';
import styles from './Avatar.module.css';

// Artwork a built-in identity carries instead of a stored picture, e.g. the StarMe assistant.
const AI_SPARK = 'builtin:ai-spark';

interface AvatarProps extends Omit<BaseAvatarProps, 'src'> {
  /** Storage key, absolute URL, or built-in artwork. */
  path: string | null | undefined;
}

export function Avatar({ path, ...rest }: AvatarProps) {
  if (path === AI_SPARK) return <AiSparkAvatar {...rest} />;
  return <BaseAvatar src={resolveImageUrl(path)} {...rest} />;
}

function AiSparkAvatar({ alt, size = 40, shape = 'square', className }: Omit<AvatarProps, 'path'>) {
  const pixels = typeof size === 'number' ? size : 40;

  return (
    <span
      role="img"
      aria-label={alt}
      className={[styles.builtIn, className].filter(Boolean).join(' ')}
      data-shape={shape}
      style={{ width: pixels, height: pixels }}
    >
      <AiCosmos className={styles.sky}>
        <AiSpark size={Math.round(pixels * 0.4)} />
      </AiCosmos>
    </span>
  );
}
