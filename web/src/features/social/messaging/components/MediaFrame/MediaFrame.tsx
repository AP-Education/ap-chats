import { type CSSProperties, type HTMLAttributes, type ReactNode, type Ref, useMemo } from 'react';

import { fitMedia, type MediaSize } from '../../media/media-fit';
import { mediaTones } from '../../media/media-tones';
import { placeholderImage } from '../../media/placeholder';
import styles from './MediaFrame.module.css';

interface MediaFrameProps extends HTMLAttributes<HTMLSpanElement> {
  ref?: Ref<HTMLSpanElement>;
  /** Unset while the image's address is still on its way. */
  src?: string;
  size: MediaSize;
  alt: string;
  /** The image's ThumbHash: a blurred copy behind it, and the colours of the badges over it. */
  placeholder?: string;
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
  onImageError?: () => void;
  /** Badges and the time, laid over the image in its own colours. */
  children?: ReactNode;
}

/** One photo or GIF in a bubble, at its own proportions inside a frame as wide as the bubble. */
export function MediaFrame({
  src,
  size,
  alt,
  placeholder,
  referrerPolicy,
  onImageError,
  children,
  className,
  style,
  ...rest
}: MediaFrameProps) {
  const fitted = fitMedia(size);
  const tones = useMemo(() => (placeholder ? mediaTones(placeholder) : null), [placeholder]);
  const standIn = useMemo(
    () => (placeholder ? `url("${placeholderImage(placeholder)}")` : undefined),
    [placeholder],
  );

  const box: CSSProperties = {
    width: fitted.width,
    aspectRatio: `${size.width} / ${size.height}`,
    backgroundImage: standIn,
  };
  const toneVariables = tones && {
    '--media-badge-start': tones.topLeft,
    '--media-badge-end': tones.bottomRight,
  };

  return (
    <span
      className={[styles.frame, className].filter(Boolean).join(' ')}
      style={{ ...toneVariables, backgroundImage: standIn, ...style }}
      {...rest}
    >
      {src ? (
        <img
          className={styles.media}
          style={box}
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy={referrerPolicy}
          onError={onImageError}
        />
      ) : (
        <span className={styles.media} style={box} role="img" aria-label={alt} />
      )}
      {children}
    </span>
  );
}
