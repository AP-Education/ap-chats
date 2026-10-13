import { useIsMobile } from '@ap-education/ui';
import { createStyles, keyframes } from 'antd-style';
import { useLayoutEffect, useRef } from 'react';

import { RoleDot } from '@/features/roles/components/RoleDot';
import { Avatar } from '@/shared/ui/Avatar';

import type { Suggestion, SuggestionGroup } from './suggestions';

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
  option: css`
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
  badge: css`
    display: grid;
    flex-shrink: 0;
    place-items: center;
    border-radius: 50%;
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimaryTextActive};
  `,
  hint: css`
    margin-left: auto;
    color: ${token.colorTextTertiary};
    font-size: 13px;
    white-space: nowrap;
  `,
}));

export type SuggestionListPlacement = 'docked' | 'floating';

interface SuggestionListProps {
  group: SuggestionGroup;
  query: string;
  active: number;
  /** Docked in the composer's suggestion strip, or floating over an inline editor. */
  placement: SuggestionListPlacement;
  onActivate: (index: number) => void;
  onPick: (suggestion: Suggestion) => void;
}

export function SuggestionList({
  group,
  query,
  active,
  placement,
  onActivate,
  onPick,
}: SuggestionListProps) {
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
      aria-label={group.ariaLabel}
    >
      <span className={styles.heading} aria-hidden>
        {group.heading}
      </span>
      {group.items.map((suggestion, index) => (
        <SuggestionOption
          key={suggestion.key}
          suggestion={suggestion}
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

interface SuggestionOptionProps {
  suggestion: Suggestion;
  index: number;
  active: boolean;
  query: string;
  onActivate: (index: number) => void;
  onPick: (suggestion: Suggestion) => void;
}

function SuggestionOption({
  suggestion,
  index,
  active,
  query,
  onActivate,
  onPick,
}: SuggestionOptionProps) {
  const { styles } = useStyles();

  return (
    <button
      type="button"
      role="option"
      data-index={index}
      aria-selected={active}
      className={styles.option}
      onMouseDown={(event) => event.preventDefault()}
      // Pointer movement, not enter: keyboard scrolling slides rows under a resting cursor.
      onMouseMove={() => !active && onActivate(index)}
      onClick={() => onPick(suggestion)}
    >
      <SuggestionVisual suggestion={suggestion} />
      <span className={styles.name}>
        <MatchedName name={suggestion.label} query={query} matchClassName={styles.match} />
      </span>
      {suggestion.hint && <span className={styles.hint}>{suggestion.hint}</span>}
    </button>
  );
}

function SuggestionVisual({ suggestion: { label, visual } }: { suggestion: Suggestion }) {
  const { styles } = useStyles();
  const isMobile = useIsMobile();
  const size = isMobile ? 36 : 30;

  if ('avatarPath' in visual)
    return <Avatar path={visual.avatarPath} alt={label} size={size} shape="circle" />;

  if ('roleColor' in visual)
    return (
      <span className={styles.badge} style={{ width: size, height: size }}>
        <RoleDot color={visual.roleColor} />
      </span>
    );

  const Icon = visual.icon;
  return (
    <span className={styles.badge} style={{ width: size, height: size }}>
      <Icon size={size * 0.55} weight="bold" />
    </span>
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
