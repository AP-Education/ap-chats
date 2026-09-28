import { createStyles } from 'antd-style';

export interface MentionCandidate {
  memberId: string;
  displayName: string | null;
  avatarPath: string | null;
}

const useStyles = createStyles(({ token, css }) => ({
  suggestions: css`
    position: absolute;
    z-index: 15;
    bottom: calc(100% + 8px);
    left: 0;
    width: min(360px, 100%);
    max-height: 240px;
    overflow-y: auto;
    padding: 5px;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadiusLG}px;
    background: ${token.colorBgElevated};
    box-shadow: ${token.boxShadowSecondary};
  `,
  candidate: css`
    display: block;
    width: 100%;
    padding: 8px 10px;
    border: 0;
    border-radius: 5px;
    background: transparent;
    color: ${token.colorText};
    text-align: left;
    cursor: pointer;

    &:hover,
    &:focus {
      background: ${token.colorPrimaryBg};
    }
  `,
}));

interface MentionCandidateListProps {
  candidates: MentionCandidate[];
  active: number;
  onPick: (candidate: MentionCandidate) => void;
}

export function MentionCandidateList({ candidates, active, onPick }: MentionCandidateListProps) {
  const { styles } = useStyles();

  return (
    <div className={styles.suggestions} role="listbox" aria-label="Згадати людину">
      {candidates.map((candidate, index) => (
        <button
          key={candidate.memberId}
          type="button"
          role="option"
          aria-selected={index === active}
          className={styles.candidate}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onPick(candidate)}
        >
          {candidate.displayName ?? 'Ім’я недоступне'}
        </button>
      ))}
    </div>
  );
}
