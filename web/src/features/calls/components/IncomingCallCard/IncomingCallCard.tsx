import { createStyles, keyframes } from 'antd-style';

import { CallIcon, EndCallIcon } from '../../callIcons';
import { useIncomingCallPresentation } from '../../hooks/useIncomingCallPresentation';
import { useIncomingCallRingtone } from '../../hooks/useIncomingCallRingtone';
import type { CallSignal } from '../../schemas';
import { CallBackdrop } from '../CallBackdrop/CallBackdrop';
import { RingingAvatar } from '../RingingAvatar/RingingAvatar';
import { IncomingCallAction } from './IncomingCallAction';

const scrimIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

// A gentle spring overshoot rather than a linear rise: it lands with a touch
// of bounce, the way a native incoming-call sheet does.
const riseIn = keyframes`
  0% { opacity: 0; transform: translateY(16px) scale(0.92); }
  60% { opacity: 1; transform: translateY(0) scale(1.02); }
  100% { transform: translateY(0) scale(1); }
`;

const useStyles = createStyles(({ token, css }) => ({
  scrim: css`
    position: fixed;
    inset: 0;
    z-index: 1400;
    display: grid;
    place-items: center;
    padding: ${token.paddingMD}px;
    background: rgba(3, 8, 9, 0.5);
    backdrop-filter: blur(10px);
    animation: ${scrimIn} ${token.motionDurationMid} ${token.motionEaseOut};

    @media (max-width: ${token.screenMD}px) {
      padding: 0;
    }
  `,
  card: css`
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: min(360px, 100%);
    padding: 48px 28px 32px;
    overflow: hidden;
    border-radius: ${token.borderRadiusLG * 2}px;
    box-shadow: 0 32px 80px rgba(0, 0, 0, 0.5);
    color: ${token.colorText};
    text-align: center;
    animation: ${riseIn} 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);

    // On a phone the ring takes the whole screen, like the system call sheet.
    @media (max-width: ${token.screenMD}px) {
      width: 100%;
      height: 100%;
      padding: calc(96px + env(safe-area-inset-top, 0px)) 24px
        calc(48px + env(safe-area-inset-bottom, 0px));
      border-radius: 0;
      animation: ${scrimIn} ${token.motionDurationMid} ${token.motionEaseOut};
    }
  `,
  content: css`
    position: relative;
    z-index: 1;
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    width: 100%;
  `,
  name: css`
    max-width: 100%;
    margin-top: 28px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: ${token.fontSizeXL}px;
    font-weight: 650;

    @media (max-width: ${token.screenMD}px) {
      font-size: ${token.fontSizeHeading3}px;
    }
  `,
  status: css`
    margin-top: ${token.marginXXS}px;
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSizeSM}px;
  `,
  actions: css`
    display: flex;
    justify-content: center;
    gap: 56px;
    margin-top: 40px;

    @media (max-width: ${token.screenMD}px) {
      gap: 88px;
      margin-top: auto;
    }
  `,
}));

interface IncomingCallCardProps {
  signal: CallSignal;
}

export function IncomingCallCard({ signal }: IncomingCallCardProps) {
  const { styles } = useStyles();
  useIncomingCallRingtone();
  const { cardAriaLabel, headline, subtitle, avatarPath, avatarAlt, dismiss, accept } =
    useIncomingCallPresentation(signal);
  const busy = dismiss.pending || accept.pending;

  return (
    <div className={styles.scrim}>
      <div className={styles.card} role="alertdialog" aria-label={cardAriaLabel}>
        <CallBackdrop />
        <div className={styles.content}>
          <RingingAvatar path={avatarPath} alt={avatarAlt} size={104} />
          <span className={styles.name}>{headline}</span>
          <span className={styles.status}>{subtitle}</span>
          <div className={styles.actions}>
            <IncomingCallAction action={dismiss} tone="danger" icon={EndCallIcon} disabled={busy} />
            <IncomingCallAction action={accept} tone="accept" icon={CallIcon} disabled={busy} />
          </div>
        </div>
      </div>
    </div>
  );
}
