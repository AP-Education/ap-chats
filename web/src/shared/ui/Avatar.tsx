import {
  AiCosmos,
  AiSpark,
  Avatar as BaseAvatar,
  type AvatarProps as BaseAvatarProps,
} from '@ap-education/ui';
import { createStyles } from 'antd-style';

import { resolveImageUrl } from '../lib/resolve-image-url';

// Artwork a built-in identity carries instead of a stored picture, e.g. the StarMe assistant.
const AI_SPARK = 'builtin:ai-spark';

const useStyles = createStyles(({ token, css }) => ({
  builtIn: css`
    display: inline-flex;
    flex-shrink: 0;
    overflow: hidden;
    border-radius: ${token.borderRadius}px;
  `,
  sky: css`
    width: 100%;
    height: 100%;
    border-radius: inherit;
  `,
  circle: css`
    border-radius: 50%;
  `,
  rounded: css`
    border-radius: ${token.borderRadiusLG}px;
  `,
}));

interface AvatarProps extends Omit<BaseAvatarProps, 'src'> {
  /** Storage key, absolute URL, or built-in artwork. */
  path: string | null | undefined;
}

export function Avatar({ path, ...rest }: AvatarProps) {
  if (path === AI_SPARK) return <AiSparkAvatar {...rest} />;
  return <BaseAvatar src={resolveImageUrl(path)} {...rest} />;
}

function AiSparkAvatar({ alt, size = 40, shape = 'square', className }: Omit<AvatarProps, 'path'>) {
  const { styles, cx } = useStyles();
  const pixels = typeof size === 'number' ? size : 40;

  return (
    <span
      role="img"
      aria-label={alt}
      className={cx(styles.builtIn, shape !== 'square' && styles[shape], className)}
      style={{ width: pixels, height: pixels }}
    >
      <AiCosmos className={styles.sky}>
        <AiSpark size={Math.round(pixels * 0.4)} />
      </AiCosmos>
    </span>
  );
}
