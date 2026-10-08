import { createStyles, keyframes } from 'antd-style';

import { Avatar } from '@/shared/ui/Avatar/Avatar';

import { CALL_PALETTE } from '../../callTheme';

const ripple = keyframes`
  0% { transform: scale(1); opacity: 0.55; }
  100% { transform: scale(1.65); opacity: 0; }
`;

const useStyles = createStyles(({ css }) => ({
  halo: css`
    position: relative;
    display: grid;
    place-items: center;

    &::before,
    &::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: color-mix(in srgb, ${CALL_PALETTE.cyan} 40%, transparent);
      animation: ${ripple} 2.4s ease-out infinite;
    }

    &::after {
      animation-delay: 1.2s;
    }

    @media (prefers-reduced-motion: reduce) {
      &::before,
      &::after {
        animation: none;
        opacity: 0.5;
      }
    }
  `,
  avatar: css`
    position: relative;
    z-index: 1;
    display: flex;
    border-radius: 50%;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
  `,
}));

interface RingingAvatarProps {
  path: string | null | undefined;
  alt: string;
  size: number;
}

/** Whoever is on the other end while the call still rings, both ways. */
export function RingingAvatar({ path, alt, size }: RingingAvatarProps) {
  const { styles } = useStyles();

  return (
    <span className={styles.halo} style={{ width: size, height: size }}>
      <span className={styles.avatar}>
        <Avatar path={path ?? null} alt={alt} size={size} shape="circle" />
      </span>
    </span>
  );
}
