import { useIsMobile } from '@ap-education/ui';
import { Skeleton } from 'antd';
import { createStyles } from 'antd-style';
import { useReducer } from 'react';

import { useWorkspaceMemberLabels } from '@/features/workspaces/hooks/useWorkspaceMemberLabels';
import { isWorkspaceAdministrator, isWorkspaceOwner } from '@/features/workspaces/workspace-access';
import { ApiError } from '@/shared/api/http';

import { useMemberProfile } from '../../hooks/useMemberProfile';
import { useMemberRoleAssignments } from '../../hooks/useMemberRoleAssignments';
import { MemberCardContext, type MemberCardScope } from '../../stores/member-card-context';
import type { MemberSummary } from '../../types';
import { memberCardView } from './member-card-view';
import { MemberCardActions } from './MemberCardActions';
import { MemberCardDetail } from './MemberCardDetail';
import { MemberCardFrame } from './MemberCardFrame';
import { MemberRoleSection } from './MemberRoleSection';
import { MemberRolesView } from './MemberRolesView';

const useStyles = createStyles(({ css }) => ({
  loading: css`
    margin-top: 20px;
  `,
}));

// The phone sheet has the room the wide-screen profile panel has, so it shows the same avatar.
const SHEET_AVATAR_SIZE = 180;

interface MemberCardProps {
  member: MemberSummary;
  onConversationOpen: () => void;
}

export function MemberCard({ member, onConversationOpen }: MemberCardProps) {
  const { styles } = useStyles();
  const isMobile = useIsMobile();
  const { workspaceId } = member;
  const profile = useMemberProfile(workspaceId, member.memberId);
  const { currentMember } = useWorkspaceMemberLabels(workspaceId);
  const { toggleRole } = useMemberRoleAssignments(workspaceId, member.memberId);
  const [view, dispatch] = useReducer(memberCardView, 'profile');

  const name = profile.data
    ? (profile.data.displayName ?? 'Ім’я недоступне')
    : (member.displayName ?? 'Ім’я недоступне');
  const avatarPath = profile.data ? profile.data.avatarPath : member.avatarPath;
  const isSelf = profile.data?.isSelf ?? false;
  const unavailable =
    profile.error instanceof ApiError && [403, 404].includes(profile.error.status);
  const scope: MemberCardScope = {
    workspaceId,
    memberId: member.memberId,
    profile: profile.data,
    isLoading: profile.isPending,
    unavailable,
    canChangeLevel: isWorkspaceOwner(currentMember) && !isSelf,
    canManageRoles: isWorkspaceAdministrator(currentMember) && !unavailable,
    assignedRoleIds: new Set(profile.data?.roles.map((role) => role.id)),
    toggleRole,
  };

  if (view === 'roles')
    return (
      <MemberCardContext.Provider value={scope}>
        <MemberRolesView name={name} onBack={() => dispatch({ type: 'backToProfile' })} />
      </MemberCardContext.Provider>
    );

  return (
    <MemberCardContext.Provider value={scope}>
      <MemberCardFrame
        name={name}
        avatarPath={avatarPath}
        detail={<MemberCardDetail />}
        avatarSize={isMobile ? SHEET_AVATAR_SIZE : undefined}
      >
        {profile.isPending ? (
          <div className={styles.loading} aria-label="Завантажуємо профіль" role="status">
            <Skeleton.Button active block size="small" />
          </div>
        ) : (
          <>
            <MemberRoleSection onManageRoles={() => dispatch({ type: 'manageRoles' })} />
            {!isSelf && <MemberCardActions onConversationOpen={onConversationOpen} />}
          </>
        )}
      </MemberCardFrame>
    </MemberCardContext.Provider>
  );
}
