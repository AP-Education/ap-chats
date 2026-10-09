import { createStyles } from 'antd-style';
import type { ReactNode } from 'react';

// The tail continues the bubble's flat bottom corner into a soft hook, shaped with a mask.
// Bubbles carry no backdrop-filter: each would be its own blurred compositor layer, and a
// conversation holds hundreds that every scroll, drag and keyboard frame recomposites.
const INCOMING_TAIL = tailMask('M8 0C8 6.6 6.3 11.6 1.1 15.4C.4 15.9.7 17 1.6 17H8Z');
const OWN_TAIL = tailMask('M0 0C0 6.6 1.7 11.6 6.9 15.4C7.6 15.9 7.3 17 6.4 17H0Z');

function tailMask(path: string) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='8' height='17'><path d='${path}'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const useStyles = createStyles(({ token, css }) => ({
  // Colours live on the stack as variables, so the bubble, its tail and everything
  // rendered inside (replies, files, links, meta) follow one own/incoming scheme. The text
  // weight stays the same on both sides and in both themes; colour alone tells them apart.
  stack: css`
    --bubble-bg: var(--chat-incoming-bg, rgba(255, 255, 255, 0.8));
    --bubble-shadow: 0 1px 1.5px rgba(23, 46, 42, 0.12);
    --bubble-text: ${token.colorText};
    --bubble-muted: ${token.colorTextSecondary};
    // Times and edit marks are text too: the secondary tone keeps them at AA contrast.
    --bubble-meta: ${token.colorTextSecondary};
    // The accent's text tone, not the raw primary: links and labels stay AA on either base.
    --bubble-accent: ${token.colorPrimaryTextActive};
    --bubble-on-accent: ${token.colorWhite};
    --bubble-link: ${token.colorPrimaryTextActive};
    --bubble-fill: ${token.colorFillTertiary};
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-width: 0;
    max-width: min(560px, 85%);

    html[data-theme='dark'] &[data-side='incoming'] {
      --bubble-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }

    // Room for the tail between the bubble and the avatar or the screen edge.
    &[data-side='incoming'] {
      margin-left: 8px;
    }

    // Two close tones fading downwards into the tail: a run of own messages reads as one
    // calm column, opaque so a pale page never washes the white text below AA. No edge
    // highlights: an inset line follows the rounded corners and reads as a stray border.
    &[data-side='own'] {
      --own-from: var(--chat-own-from, ${token.colorPrimary});
      --own-to: var(--chat-own-to, ${token.colorPrimary});
      --bubble-bg: linear-gradient(175deg, var(--own-to), var(--own-from));
      --bubble-tail: var(--own-from);
      --bubble-shadow: 0 1px 2px rgba(18, 22, 60, 0.16);
      // Secondary text stays fully white and steps back by size alone, so the small times
      // keep AA on either end of the gradient. Nested blocks darken the fill, never lighten it.
      --bubble-text: ${token.colorWhite};
      --bubble-muted: ${token.colorWhite};
      --bubble-meta: ${token.colorWhite};
      --bubble-accent: ${token.colorWhite};
      --bubble-on-accent: var(--own-from);
      --bubble-link: ${token.colorWhite};
      --bubble-fill: rgba(0, 0, 0, 0.14);
      --excerpt-bg: rgba(0, 0, 0, 0.14);
      --excerpt-bg-hover: rgba(0, 0, 0, 0.2);
      --mention-bg: rgba(0, 0, 0, 0.14);
      --mention-bg-hover: rgba(0, 0, 0, 0.2);
      --mention-color: ${token.colorWhite};
      --mention-me-bg: var(--mention-bg);
      --mention-me-bg-hover: var(--mention-bg-hover);
      --mention-me-color: var(--mention-color);
      align-items: flex-end;
      margin-right: 8px;
    }
    html[data-theme='dark'] &[data-side='own'] {
      --own-from: color-mix(in srgb, var(--chat-own-from, ${token.colorPrimary}) 90%, transparent);
      --own-to: color-mix(in srgb, var(--chat-own-to, ${token.colorPrimary}) 84%, transparent);
    }

    // A warm touch on the usual bubble rather than antd's warning fill, which turns
    // into a muddy olive block on dark. Dark keeps it faint: amber over blue-grey drifts
    // to olive, so the amber mention chip carries the signal there.
    &[data-tone='attention'] {
      --attention-share: 14%;
      --bubble-bg: color-mix(
        in srgb,
        ${token.colorWarning} var(--attention-share),
        var(--chat-incoming-bg, rgba(255, 255, 255, 0.8))
      );
    }
    html[data-theme='dark'] &[data-tone='attention'] {
      --attention-share: 7%;
    }

    &[data-tone='failed'] {
      --bubble-bg: ${token.colorErrorBg};
      --bubble-tail: ${token.colorErrorBg};
      --bubble-text: ${token.colorText};
      --bubble-muted: ${token.colorTextSecondary};
      // Pulled towards the body text: the stock error red on its own tint falls below AA.
      --bubble-meta: color-mix(in srgb, ${token.colorError}, ${token.colorText} 40%);
      --bubble-accent: color-mix(in srgb, ${token.colorError}, ${token.colorText} 40%);
      --bubble-on-accent: ${token.colorWhite};
      --bubble-link: color-mix(in srgb, ${token.colorError}, ${token.colorText} 40%);
      --bubble-fill: ${token.colorFillTertiary};
    }

    &[data-wide] {
      width: min(560px, 85%);
    }

    @media (prefers-reduced-transparency: reduce) {
      &[data-side='incoming']:not([data-tone]) {
        --bubble-bg: ${token.colorBgContainer};
      }
    }

    // Asked-for higher contrast: solid fills, own bubbles in their deeper tone alone.
    @media (prefers-contrast: more) {
      &[data-side='incoming']:not([data-tone]) {
        --bubble-bg: ${token.colorBgContainer};
      }
      &[data-side='own'] {
        --bubble-bg: var(--chat-own-from, ${token.colorPrimary});
      }
    }
  `,
  bubble: css`
    position: relative;
    min-width: 0;
    max-width: 100%;
    --bubble-radius: ${token.borderRadius * 2}px;
    padding: 6px ${token.paddingSM}px ${token.paddingXS}px;
    border-radius: var(--bubble-radius);
    background: var(--bubble-bg);
    box-shadow: var(--bubble-shadow);
    color: var(--bubble-text);
    overflow-wrap: anywhere;

    & > * + * {
      margin-top: 4px;
    }

    // The corners on the author's side follow the run (HistoryRun): joints round less,
    // and the closing corner meets the tail. On its own a bubble opens and closes a run.
    [data-side='incoming'] > & {
      border-top-left-radius: var(--run-top-radius, var(--bubble-radius));
      border-bottom-left-radius: var(--run-bottom-radius, 0);
    }
    [data-side='own'] > & {
      border-top-right-radius: var(--run-top-radius, var(--bubble-radius));
      border-bottom-right-radius: var(--run-bottom-radius, 0);
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
      margin-bottom: ${token.marginXXS}px;
    }

    &[data-variant='emoji'] {
      padding: 0;
      background: none;
      box-shadow: none;
    }
  `,
  tail: css`
    display: var(--run-tail, block);
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
  variant?: BubbleVariant;
  tone?: 'attention' | 'failed';
  wide?: boolean;
  children: ReactNode;
}

export function Bubble({ own, variant = 'text', tone, wide, children }: BubbleProps) {
  const { styles } = useStyles();
  const hasTail = variant !== 'emoji';

  return (
    <div
      className={styles.stack}
      data-side={own ? 'own' : 'incoming'}
      data-tone={tone}
      data-wide={wide || undefined}
    >
      <div className={styles.bubble} data-variant={variant}>
        {children}
      </div>
      {hasTail && <span className={styles.tail} aria-hidden />}
    </div>
  );
}
