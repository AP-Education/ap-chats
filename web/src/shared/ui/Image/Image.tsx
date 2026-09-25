import type { CSSProperties, HTMLAttributes } from 'react';
import { useMemo, useState } from 'react';

import styles from './Image.module.css';

const BASE_URL = import.meta.env.VITE_IMAGES_URL;

type Shape = 'circle' | 'square' | 'rounded';

export interface ImageProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'draggable'> {
  path: string | null;
  alt: string;
  width?: number | string;
  height?: number | string;
  shape?: Shape;
  fit?: 'cover' | 'contain';
  backgroundColor?: string;
  textColor?: string;
  fallbackText?: string;
  lazy?: boolean;
  draggable?: HTMLAttributes<HTMLImageElement>['draggable'];
}

// Ported from front-LMS's shared/ui/Image: resolves a storage key into a URL
// (absolute http(s)/blob paths pass through unchanged), falling back to
// initials on a colored tile when there's no path or the image fails to load.
export function Image({
  path,
  alt,
  width,
  height,
  shape = 'square',
  fit = 'cover',
  backgroundColor,
  textColor,
  fallbackText,
  className,
  style,
  lazy = true,
  draggable,
  ...rest
}: ImageProps) {
  const [hasError, setHasError] = useState(false);

  const resolvedSrc = useMemo(() => {
    if (!path || hasError) return null;
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) {
      return path;
    }
    return `${BASE_URL}/${path}`;
  }, [hasError, path]);

  const mergedClassName = [styles.wrapper, styles[shape], className ?? '']
    .filter(Boolean)
    .join(' ');

  const computedText = useMemo(() => {
    const text = fallbackText ?? alt;
    return text ? text.trim().slice(0, 2).toUpperCase() : '?';
  }, [alt, fallbackText]);

  const wrapperStyle: CSSProperties = { width, height, ...style };

  const fallbackStyle: CSSProperties = {
    backgroundColor: backgroundColor ?? 'var(--ant-color-fill-tertiary)',
    color: textColor ?? 'var(--ant-color-text)',
    fontSize:
      typeof width === 'number' && typeof height === 'number'
        ? `${Math.max(Math.min(width, height) * 0.4, 12)}px`
        : '16px',
  };

  return (
    <span className={mergedClassName} style={wrapperStyle} {...rest}>
      {resolvedSrc ? (
        <img
          src={resolvedSrc}
          alt={alt}
          draggable={draggable}
          style={{ objectFit: fit, width: '100%', height: '100%', display: 'block' }}
          onError={() => setHasError(true)}
          loading={lazy ? 'lazy' : undefined}
        />
      ) : (
        <span className={styles.fallback} style={fallbackStyle}>
          {computedText}
        </span>
      )}
    </span>
  );
}
