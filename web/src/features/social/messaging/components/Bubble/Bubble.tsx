import { createStyles } from 'antd-style';
import type { ReactNode } from 'react';

// The tail continues the bubble's flat bottom corner into a soft hook. It is shaped with a
// mask and painted without backdrop-filter: Chromium clips a backdrop by neither mask nor
// clip-path reliably, and a solid hook this small reads the same as the frosted bubble.
const INCOMING_TAIL = tailMask('M8 0C8 6.6 6.3 11.6 1.1 15.4C.4 15.9.7 17 1.6 17H8Z');
const OWN_TAIL = tailMask('M0 0C0 6.6 1.7 11.6 6.9 15.4C7.6 15.9 7.3 17 6.4 17H0Z');

function tailMask(path: string) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='8' height='17'><path d='${path}'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const useStyles = createStyles(({ token, css }) => ({
  // Colours live on the stack as variables, so the bubble, its tail and everything
  // rendered inside (replies, files, links, meta) follow one own/incoming scheme.
  stack: css`
    --bubble-bg: var(--chat-incoming-bg, rgba(255, 255, 255, 0.8));
    --bubble-blur: blur(20px) saturate(1.4);
    --bubble-shadow: 0 1px 1.5px rgba(23, 46, 42, 0.12);
    --bubble-text: ${token.colorText};
    --bubble-muted: ${token.colorTextSecondary};
    --bubble-meta: ${token.colorTextTertiary};
    --bubble-accent: ${token.colorPrimary};
    --bubble-on-accent: ${token.colorWhite};
    --bubble-link: ${token.colorPrimary};
    --bubble-fill: rgba(31, 47, 45, 0.06);
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-width: 0;
    max-width: min(560px, 85%);

    // Room for the tail between the bubble and the avatar or the screen edge.
    &[data-side='incoming'] {
      margin-left: 8px;
    }

    &[data-side='own'] {
      --own-from: var(--chat-own-from, ${token.colorPrimary});
      --bubble-bg: linear-gradient(322deg, var(--own-from), var(--chat-own-to, var(--own-from)));
      --bubble-tail: var(--own-from);
      --bubble-blur: none;
      --bubble-text: ${token.colorWhite};
      --bubble-muted: rgba(255, 255, 255, 0.8);
      --bubble-meta: rgba(255, 255, 255, 0.72);
      --bubble-accent: ${token.colorWhite};
      --bubble-on-accent: var(--own-from);
      --bubble-link: ${token.colorWhite};
      --bubble-fill: rgba(255, 255, 255, 0.16);
      align-items: flex-end;
      margin-right: 8px;
    }

    &[data-tone='attention'] {
      --bubble-bg: rgba(255, 247, 226, 0.92);
    }

    &[data-tone='failed'] {
      --bubble-bg: ${token.colorErrorBg};
      --bubble-tail: ${token.colorErrorBg};
      --bubble-text: ${token.colorText};
      --bubble-muted: ${token.colorTextSecondary};
      --bubble-meta: ${token.colorErrorText};
      --bubble-accent: ${token.colorError};
      --bubble-on-accent: ${token.colorWhite};
      --bubble-link: ${token.colorError};
      --bubble-fill: rgba(31, 47, 45, 0.06);
    }

    &[data-wide] {
      width: min(560px, 85%);
    }

    // Wider screens keep room beside the bubble for the hover toolbar.
    @media (min-width: ${token.screenMD + 1}px) {
      max-width: min(560px, calc(100% - 120px));

      &[data-wide] {
        width: min(560px, calc(100% - 120px));
      }
    }

    @supports not (backdrop-filter: blur(1px)) {
      &[data-side='incoming']:not([data-tone]) {
        --bubble-bg: rgba(255, 255, 255, 0.94);
      }
    }

    @media (prefers-reduced-transparency: reduce) {
      &[data-side='incoming']:not([data-tone]) {
        --bubble-bg: ${token.colorBgContainer};
        --bubble-blur: none;
      }
    }
  `,
  bubble: css`
    position: relative;
    min-width: 0;
    max-width: 100%;
    padding: 6px 12px 7px;
    border-radius: 16px;
    background: var(--bubble-bg);
    backdrop-filter: var(--bubble-blur);
    box-shadow: var(--bubble-shadow);
    color: var(--bubble-text);
    overflow-wrap: anywhere;

    & > * + * {
      margin-top: 4px;
    }

    [data-side='incoming'] > &:not([data-group-start]) {
      border-top-left-radius: 6px;
    }
    [data-side='incoming'] > &:not([data-group-end]) {
      border-bottom-left-radius: 6px;
    }
    [data-side='incoming'] > &[data-group-end] {
      border-bottom-left-radius: 0;
    }
    [data-side='own'] > &:not([data-group-start]) {
      border-top-right-radius: 6px;
    }
    [data-side='own'] > &:not([data-group-end]) {
      border-bottom-right-radius: 6px;
    }
    [data-side='own'] > &[data-group-end] {
      border-bottom-right-radius: 0;
    }

    [data-wide] > & {
      width: 100%;
      padding: 4px;
    }

    &[data-variant='media'] {
      padding: 4px;
    }
    &[data-variant='media'] > :not([data-attachment-media]) {
      margin-inline: 8px;
    }
    &[data-variant='media'] > :first-child:not([data-attachment-media]) {
      margin-top: 2px;
    }
    &[data-variant='media'] > :last-child:not([data-attachment-media]) {
      margin-bottom: 3px;
    }

    &[data-variant='emoji'] {
      padding: 0;
      background: none;
      backdrop-filter: none;
      box-shadow: none;
    }
  `,
  tail: css`
    position: absolute;
    bottom: 0;
    left: -8px;
    width: 8px;
    height: 17px;
    background: var(--bubble-tail, var(--bubble-bg));
    mask: ${INCOMING_TAIL} no-repeat;

    [data-side='own'] > & {
      left: auto;
      right: -8px;
      mask-image: ${OWN_TAIL};
    }
  `,
}));

export type BubbleVariant = 'text' | 'media' | 'emoji';

interface BubbleProps {
  own: boolean;
  groupStart: boolean;
  groupEnd: boolean;
  variant?: BubbleVariant;
  tone?: 'attention' | 'failed';
  wide?: boolean;
  /** Floating controls anchored to the bubble's outer edge, like the desktop toolbar. */
  aside?: ReactNode;
  children: ReactNode;
}

export function Bubble({
  own,
  groupStart,
  groupEnd,
  variant = 'text',
  tone,
  wide,
  aside,
  children,
}: BubbleProps) {
  const { styles } = useStyles();
  const hasTail = groupEnd && variant !== 'emoji';

  return (
    <div
      className={styles.stack}
      data-side={own ? 'own' : 'incoming'}
      data-tone={tone}
      data-wide={wide || undefined}
    >
      <div
        className={styles.bubble}
        data-variant={variant}
        data-group-start={groupStart || undefined}
        data-group-end={hasTail || undefined}
      >
        {children}
      </div>
      {hasTail && <span className={styles.tail} aria-hidden />}
      {aside}
    </div>
  );
}
