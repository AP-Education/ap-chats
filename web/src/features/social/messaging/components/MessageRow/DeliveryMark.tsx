import { createStyles, keyframes } from 'antd-style';

import { useIsReadByPeer } from '@/features/social/read-receipts/stores/peer-read-context';

import type { DeliveryStatus } from '../../types';

type MarkState = 'failed' | 'sending' | 'sent' | 'read';

const labels: Record<MarkState, string> = {
  failed: 'Не надіслано',
  sending: 'Надсилається',
  sent: 'Надіслано',
  read: 'Прочитано',
};

const tick = keyframes`
  to { transform: rotate(360deg); }
`;

const useStyles = createStyles(({ css }) => ({
  // Every state draws into one box, so settling a send or being read never moves the time.
  mark: css`
    overflow: visible;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.1;
    stroke-linecap: round;
    stroke-linejoin: round;

    & [data-part] {
      opacity: 0;
      transition:
        opacity 120ms ease-out,
        stroke-dashoffset 220ms ease-out,
        transform 240ms cubic-bezier(0.2, 0, 0, 1);
    }

    & [data-part='first'],
    & [data-part='second'] {
      stroke-dasharray: 1;
      stroke-dashoffset: 1;
    }

    // A lone check sits centred, then steps aside for the second one.
    & [data-part='first'] {
      transform: translateX(2.5px);
    }

    & [data-hand] {
      transform-origin: 9px 6px;
    }

    &[data-state='failed'] {
      color: var(--bubble-accent);
    }

    &[data-state='failed'] [data-part='alert'],
    &[data-state='sending'] [data-part='clock'] {
      opacity: 1;
    }

    &[data-state='sending'] [data-hand] {
      animation: ${tick} 1.2s linear infinite;
    }

    &[data-state='sent'] [data-part='first'],
    &[data-state='read'] [data-part='first'],
    &[data-state='read'] [data-part='second'] {
      opacity: 1;
      stroke-dashoffset: 0;
    }

    &[data-state='read'] [data-part='first'] {
      transform: none;
    }

    @media (prefers-reduced-motion: reduce) {
      &[data-state='sending'] [data-hand] {
        animation: none;
      }
    }
  `,
}));

/** Telegram's marks as one glyph: a clock while sending, one check once sent, two once read. */
export function DeliveryMark({
  delivery,
  seq,
}: {
  delivery: DeliveryStatus | undefined;
  seq: string;
}) {
  const { styles } = useStyles();
  const isRead = useIsReadByPeer(seq);
  const state = markState(delivery, isRead);

  return (
    <svg
      className={styles.mark}
      data-state={state}
      viewBox="0 0 18 12"
      width={18}
      height={12}
      role="img"
      aria-label={labels[state]}
    >
      <g data-part="alert">
        <circle cx="9" cy="6" r="4.75" />
        <path d="M9 3.75v2.5M9 8.25v.01" />
      </g>
      <g data-part="clock">
        <circle cx="9" cy="6" r="4.75" />
        <path d="M9 6h2" />
        <path data-hand d="M9 6V3" />
      </g>
      <path data-part="first" pathLength={1} d="M1.5 6.75l3 3 6.5-7.5" />
      <path data-part="second" pathLength={1} d="M7.95 8.2l1.55 1.55 6.5-7.5" />
    </svg>
  );
}

function markState(delivery: DeliveryStatus | undefined, isRead: boolean): MarkState {
  if (delivery === 'failed') return 'failed';
  if (delivery) return 'sending';

  return isRead ? 'read' : 'sent';
}
