import { IconButton } from '@ap-education/ui';
import {
  ArrowClockwiseIcon,
  CaretUpIcon,
  LockSimpleIcon,
  MicrophoneIcon,
  PaperPlaneTiltIcon,
} from '@phosphor-icons/react';
import { type MouseEvent, type PointerEvent, useEffect, useId, useRef } from 'react';

import type { VoiceGestureMode, VoicePhase } from './types';
import styles from './VoiceComposer.module.css';

interface Hold {
  id: number;
  x: number;
  y: number;
  at: number;
  locked: boolean;
}

export function VoiceRecordAction({
  active,
  visible,
  disabled,
  busy,
  phase,
  mode,
  sent,
  onStart,
  onMode,
  onRelease,
  onInterrupt,
  onCancel,
  onSend,
}: {
  active: boolean;
  visible: boolean;
  disabled: boolean;
  busy: boolean;
  phase: VoicePhase;
  mode: VoiceGestureMode;
  sent: boolean;
  onStart: () => boolean;
  onMode: (mode: VoiceGestureMode) => void;
  onRelease: (shortTap: boolean) => void;
  onInterrupt: () => void;
  onCancel: () => void;
  onSend: () => void;
}) {
  const button = useRef<HTMLButtonElement>(null);
  const hold = useRef<Hold | null>(null);
  const ignoreClick = useRef(false);
  const wasActive = useRef(false);
  const hintId = useId();
  const holding = active && mode !== 'locked';
  const unavailable = !active && (disabled || busy);
  const finalizing = active && !holding && (phase === 'stopping' || sent);

  useEffect(() => {
    if (!active) {
      hold.current = null;
      if (wasActive.current) button.current?.focus({ preventScroll: true });
    }
    wasActive.current = active;
  }, [active]);

  function down(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    if (active) {
      ignoreClick.current = false;
      return;
    }
    event.preventDefault();
    if (unavailable || hold.current || !onStart()) return;
    ignoreClick.current = true;
    hold.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      at: performance.now(),
      locked: false,
    };
    onMode('holding');
    // Synthetic integration events have no browser pointer to capture.
    if (event.isTrusted) event.currentTarget.setPointerCapture(event.pointerId);
  }

  function move(event: PointerEvent<HTMLButtonElement>) {
    const origin = hold.current;
    if (!origin || origin.id !== event.pointerId || origin.locked) return;
    const left = origin.x - event.clientX;
    const up = origin.y - event.clientY;
    if (left >= 80 && left > up) {
      hold.current = null;
      onCancel();
      return;
    }
    if (up >= 64 && up > left) {
      origin.locked = true;
      onMode('locked');
      return;
    }
    if (left > 28 && left > up) onMode('cancelling');
    else if (up > 24 && up > left) onMode('locking');
    else onMode('holding');
  }

  function up(event: PointerEvent<HTMLButtonElement>) {
    const origin = hold.current;
    if (!origin || origin.id !== event.pointerId) return;
    hold.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (!origin.locked) onRelease(performance.now() - origin.at < 300);
  }

  function interrupted(event: PointerEvent<HTMLButtonElement>) {
    if (!hold.current || hold.current.id !== event.pointerId) return;
    const locked = hold.current.locked;
    hold.current = null;
    if (!locked) onInterrupt();
  }

  function click(event: MouseEvent<HTMLButtonElement>) {
    if (event.detail > 0 && ignoreClick.current) {
      ignoreClick.current = false;
      return;
    }
    if (!active || phase === 'error') {
      if (onStart()) onMode('locked');
    } else if (!holding) onSend();
  }

  const label = !active
    ? 'Записати голосове повідомлення'
    : phase === 'error'
      ? 'Повторити запис'
      : holding
        ? 'Утримуйте для запису'
        : 'Надіслати голосове';
  return (
    <div
      className={styles.actionSlot}
      data-active={active || undefined}
      hidden={!active && !visible}
    >
      <span className={styles.accessibleHint} id={hintId}>
        Утримуйте й відпустіть, щоб надіслати. Свайп ліворуч скасовує, вгору — фіксує запис.
        Короткий тап починає запис без утримання.
      </span>
      {holding && (
        <div
          className={styles.lockHint}
          data-approaching={mode === 'locking' || undefined}
          aria-hidden="true"
        >
          <LockSimpleIcon size={19} />
          <CaretUpIcon size={17} />
        </div>
      )}
      <IconButton
        ref={button}
        size={48}
        className={styles.recordAction}
        data-holding={holding || undefined}
        aria-label={label}
        aria-describedby={hintId}
        aria-busy={active && (phase === 'requesting' || phase === 'stopping')}
        disabled={unavailable || finalizing || (active && phase === 'error' && busy)}
        title={!active ? 'Утримуйте для запису · вгору — без утримання' : label}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={interrupted}
        onLostPointerCapture={interrupted}
        onContextMenu={(event) => event.preventDefault()}
        onClick={click}
      >
        {!active || holding ? (
          <MicrophoneIcon size={24} weight="fill" />
        ) : phase === 'error' ? (
          <ArrowClockwiseIcon size={24} />
        ) : (
          <PaperPlaneTiltIcon size={24} weight="fill" />
        )}
      </IconButton>
    </div>
  );
}
