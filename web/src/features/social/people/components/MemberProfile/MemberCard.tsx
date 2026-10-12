import { useIsMobile } from '@ap-education/ui';
import { useQueryClient } from '@tanstack/react-query';
import { Skeleton } from 'antd';
import { createStyles } from 'antd-style';
import { useReducer } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { AccessLevelBadge } from '@/features/workspaces/components/AccessLevelBadge';
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace';
import { useWorkspaceMemberLabels } from '@/features/workspaces/hooks/useWorkspaceMemberLabels';
import { isWorkspaceAdministrator, isWorkspaceOwner } from '@/features/workspaces/workspace-access';
import { ApiError } from '@/shared/api/http';

import { useMemberProfile } from '../../hooks/useMemberProfile';
import { useMemberRoleAssignments } from '../../hooks/useMemberRoleAssignments';
import { peopleQueryKeys } from '../../queryKeys';
import type { MemberSummary } from '../../types';
import { memberCardView } from './member-card-view';
import { MemberCardActions } from './MemberCardActions';
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
  const { identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const { workspace } = useActiveWorkspace();
  const workspaceId = workspace?.id ?? '';
  const profile = useMemberProfile(workspace?.id, member.memberId);
  const { currentMember } = useWorkspaceMemberLabels(workspace?.id);
  const { toggleRole } = useMemberRoleAssignments(workspaceId, member.memberId);
  const [view, dispatch] = useReducer(memberCardView, 'profile');

  const name = profile.data
    ? (profile.data.displayName ?? 'Ім’я недоступне')
    : (member.displayName ?? 'Ім’я недоступне');
  const avatarPath = profile.data ? profile.data.avatarPath : member.avatarPath;
  const unavailable =
    !workspace || (profile.error instanceof ApiError && [403, 404].includes(profile.error.status));
  const roles = profile.data?.roles ?? [];
  const isSelf = profile.data?.isSelf ?? false;
  const canManageRoles = isWorkspaceAdministrator(currentMember);

  if (view === 'roles')
    return (
      <MemberRolesView
        workspaceId={workspaceId}
        name={name}
        assignedRoleIds={new Set(roles.map((role) => role.id))}
        onToggle={toggleRole}
        onBack={() => dispatch({ type: 'backToProfile' })}
      />
    );

  const detail = profile.isPending ? (
    ''
  ) : unavailable || !profile.data ? (
    'Учасник недоступний'
  ) : (
    <AccessLevelBadge
      workspaceId={workspaceId}
      memberId={member.memberId}
      accessLevel={profile.data.accessLevel}
      editable={isWorkspaceOwner(currentMember) && !isSelf}
      onChanged={() =>
        void queryClient.invalidateQueries({
          queryKey: peopleQueryKeys.profile(identity, workspaceId, member.memberId),
        })
      }
    />
  );

  return (
    <MemberCardFrame
      name={name}
      avatarPath={avatarPath}
      detail={detail}
      avatarSize={isMobile ? SHEET_AVATAR_SIZE : undefined}
    >
      {profile.isPending ? (
        <div className={styles.loading} aria-label="Завантажуємо профіль" role="status">
          <Skeleton.Button active block size="small" />
        </div>
      ) : (
        <>
          <MemberRoleSection
            workspaceId={workspaceId}
            roles={roles}
            canManage={canManageRoles && !unavailable}
            isMobile={isMobile}
            onToggle={toggleRole}
            onManageRoles={() => dispatch({ type: 'manageRoles' })}
          />
          {!isSelf && (
            <MemberCardActions
              workspaceId={workspaceId}
              memberId={member.memberId}
              unavailable={unavailable}
              onConversationOpen={onConversationOpen}
            />
          )}
        </>
      )}
    </MemberCardFrame>
  );
}
