import { useIsMobile } from '@ap-education/ui';
import { createStyles, keyframes } from 'antd-style';
import { useLayoutEffect, useRef } from 'react';

import { Avatar } from '@/shared/ui/Avatar';

export interface MentionCandidate {
  memberId: string;
  displayName: string | null;
  avatarPath: string | null;
}

const rise = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;

const useStyles = createStyles(({ token, css }) => ({
  panel: css`
    position: absolute;
    z-index: 15;
    display: flex;
    flex-direction: column;
    max-height: min(304px, 42vh);
    overflow-y: auto;
    padding: 6px;
    border-radius: ${token.borderRadiusLG}px;
    background: color-mix(in srgb, ${token.colorBgElevated} 80%, transparent);
    backdrop-filter: var(--glass-blur, blur(24px) saturate(1.5));
    box-shadow: ${token.boxShadowSecondary};
    overscroll-behavior: contain;
    pointer-events: auto;
    animation: ${rise} 0.14s ease-out;
  `,
  // Docked in the composer's strip: as wide as the composer, lifted just above it.
  docked: css`
    right: 0;
    bottom: 8px;
    left: 0;
  `,
  floating: css`
    bottom: calc(100% + 8px);
    left: 0;
    width: min(360px, 100%);
  `,
  heading: css`
    padding: 6px 10px 4px;
    color: ${token.colorTextSecondary};
    font-size: 12px;
    font-weight: 600;
  `,
  candidate: css`
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 44px;
    padding: 6px 10px;
    border: 0;
    border-radius: ${token.borderRadius}px;
    background: transparent;
    color: ${token.colorText};
    font-size: ${token.fontSize}px;
    text-align: left;
    cursor: pointer;

    &[aria-selected='true'] {
      background: color-mix(in srgb, ${token.colorPrimary} 14%, transparent);
    }

    @media (max-width: ${token.screenMD}px) {
      min-height: 52px;
      font-size: 16px;
    }
  `,
  name: css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  match: css`
    color: ${token.colorPrimaryTextActive};
    font-weight: 650;
  `,
}));

export type MentionListPlacement = 'docked' | 'floating';

interface MentionCandidateListProps {
  candidates: MentionCandidate[];
  query: string;
  active: number;
  /** Docked in the composer's suggestion strip, or floating over an inline editor. */
  placement: MentionListPlacement;
  onActivate: (index: number) => void;
  onPick: (candidate: MentionCandidate) => void;
}

export function MentionCandidateList({
  candidates,
  query,
  active,
  placement,
  onActivate,
  onPick,
}: MentionCandidateListProps) {
  const { styles, cx } = useStyles();
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    panelRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  return (
    <div
      ref={panelRef}
      className={cx(styles.panel, styles[placement])}
      role="listbox"
      aria-label="Згадати людину"
    >
      <span className={styles.heading} aria-hidden>
        Учасники
      </span>
      {candidates.map((candidate, index) => (
        <MentionCandidateOption
          key={candidate.memberId}
          candidate={candidate}
          index={index}
          active={index === active}
          query={query}
          onActivate={onActivate}
          onPick={onPick}
        />
      ))}
    </div>
  );
}

interface MentionCandidateOptionProps {
  candidate: MentionCandidate;
  index: number;
  active: boolean;
  query: string;
  onActivate: (index: number) => void;
  onPick: (candidate: MentionCandidate) => void;
}

function MentionCandidateOption({
  candidate,
  index,
  active,
  query,
  onActivate,
  onPick,
}: MentionCandidateOptionProps) {
  const { styles } = useStyles();
  const isMobile = useIsMobile();
  const name = candidate.displayName ?? 'Ім’я недоступне';

  return (
    <button
      type="button"
      role="option"
      data-index={index}
      aria-selected={active}
      className={styles.candidate}
      onMouseDown={(event) => event.preventDefault()}
      // Pointer movement, not enter: keyboard scrolling slides rows under a resting cursor.
      onMouseMove={() => !active && onActivate(index)}
      onClick={() => onPick(candidate)}
    >
      <Avatar path={candidate.avatarPath} alt={name} size={isMobile ? 36 : 30} shape="circle" />
      <span className={styles.name}>
        <MatchedName name={name} query={query} matchClassName={styles.match} />
      </span>
    </button>
  );
}

interface MatchedNameProps {
  name: string;
  query: string;
  matchClassName: string;
}

function MatchedName({ name, query, matchClassName }: MatchedNameProps) {
  if (!query) return name;

  const start = name.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  if (start < 0) return name;

  const end = start + query.length;
  return (
    <>
      {name.slice(0, start)}
      <span className={matchClassName}>{name.slice(start, end)}</span>
      {name.slice(end)}
    </>
  );
}
