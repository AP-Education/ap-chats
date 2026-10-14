import { createStyles } from 'antd-style';

import { MemberProfileTrigger } from '@/features/social/people/components/MemberProfile/MemberProfileTrigger';
import { MemberLabel } from '@/features/workspaces/components/MemberLabel';
import type { WorkspaceMemberLabel } from '@/features/workspaces/hooks/useWorkspaceMemberLabels';

const useStyles = createStyles(({ token, css }) => ({
  member: css`
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 58px;
    padding: 7px 10px;
    border-radius: ${token.borderRadius}px;
    &:hover {
      background: ${token.colorFillTertiary};
    }
  `,
  trigger: css`
    display: block;
    width: 100%;
    min-width: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: ${token.colorText};
    text-align: left;
    cursor: pointer;

    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: 3px;
      border-radius: ${token.borderRadius}px;
    }
  `,
}));

interface ChannelMemberRowProps {
  entry: WorkspaceMemberLabel;
  /** The colour of the person's top coloured role. */
  color: string | null;
}

export function ChannelMemberRow({ entry, color }: ChannelMemberRowProps) {
  const { styles } = useStyles();

  return (
    <li className={styles.member}>
      <MemberProfileTrigger
        member={{
          workspaceId: entry.member.workspaceId,
          memberId: entry.member.id,
          displayName: entry.member.profile.displayName,
          avatarPath: entry.member.profile.avatarPath,
        }}
      >
        <button type="button" className={styles.trigger}>
          <MemberLabel entry={entry} size={40} color={color} />
        </button>
      </MemberProfileTrigger>
    </li>
  );
}
