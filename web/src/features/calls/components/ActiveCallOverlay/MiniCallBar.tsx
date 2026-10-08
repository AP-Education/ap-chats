import { createStyles, keyframes } from 'antd-style';

import { CALL_PALETTE } from '../../callTheme';
import { LeaveCallControl } from './controls/LeaveCallControl';
import { CameraControl, MicrophoneControl } from './controls/MediaControls';

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
`;

const useStyles = createStyles(({ token, css }) => ({
  bar: css`
    display: flex;
    align-items: center;
    gap: ${token.paddingXS}px;
    height: 48px;
    padding: 0 10px 0 6px;
    background:
      linear-gradient(
        100deg,
        color-mix(in srgb, ${CALL_PALETTE.teal} 42%, transparent),
        color-mix(in srgb, ${CALL_PALETTE.indigo} 30%, transparent)
      ),
      ${token.colorBgLayout};
    color: ${token.colorText};
  `,
  // The clickable "return to call" area matters more than any other control
  // here — it takes almost the full bar height rather than losing most of
  // it to its own padding on top of the bar's.
  expand: css`
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    align-self: stretch;
    min-width: 0;
    margin: 6px 0;
    padding: 0 10px;
    border: none;
    border-radius: ${token.borderRadiusLG}px;
    background: transparent;
    color: inherit;
    text-align: left;
    cursor: pointer;

    &:hover {
      background: ${token.colorFillTertiary};
    }

    &:focus-visible {
      outline: 2px solid ${token.colorText};
      outline-offset: -2px;
    }
  `,
  dot: css`
    width: 8px;
    height: 8px;
    flex-shrink: 0;
    border-radius: 50%;
    background: ${CALL_PALETTE.live};
    box-shadow: 0 0 10px ${CALL_PALETTE.live};
    animation: ${pulse} 1.6s ease-in-out infinite;
  `,
  info: css`
    display: flex;
    align-items: baseline;
    gap: ${token.paddingXS}px;
    min-width: 0;
  `,
  // Named to match CallScreen's own title/duration: restoring or minimizing
  // morphs one into the other via the browser's View Transitions API
  // instead of an instant swap.
  title: css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: ${token.fontSizeSM}px;
    font-weight: 600;
    view-transition-name: active-call-title;
  `,
  duration: css`
    flex-shrink: 0;
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextSecondary};
    font-variant-numeric: tabular-nums;
    view-transition-name: active-call-duration;
  `,
  actions: css`
    display: flex;
    align-items: center;
    gap: ${token.paddingXS}px;
    flex-shrink: 0;
  `,
}));

const CONTROL = { size: 34, iconSize: 18 };

interface MiniCallBarProps {
  title: string;
  duration: string;
  onExpand: () => void;
}

/** The app-level "return to call" strip: the room stays connected, only the stage collapses. */
export function MiniCallBar({ title, duration, onExpand }: MiniCallBarProps) {
  const { styles } = useStyles();

  return (
    <div className={styles.bar} role="status">
      <button
        type="button"
        className={styles.expand}
        aria-label={`Повернутися до дзвінка: ${title}`}
        onClick={onExpand}
      >
        <span className={styles.dot} aria-hidden />
        <span className={styles.info}>
          <span className={styles.title}>{title}</span>
          <span className={styles.duration}>{duration}</span>
        </span>
      </button>
      <div className={styles.actions}>
        <MicrophoneControl {...CONTROL} />
        <CameraControl {...CONTROL} hiddenWhenOff />
        <LeaveCallControl {...CONTROL} />
      </div>
    </div>
  );
}
