import { useQueryClient } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { AccessLevelBadge } from '@/features/workspaces/components/AccessLevelBadge';
import { useChangeAccessLevel } from '@/features/workspaces/hooks/useChangeAccessLevel';
import type { WorkspaceAccessLevel } from '@/features/workspaces/types';

import { peopleQueryKeys } from '../../queryKeys';
import { useMemberCard } from '../../stores/member-card-context';

interface MemberAccessLevelProps {
  accessLevel: WorkspaceAccessLevel;
}

/** The person's access level on their card, shown at once when the owner changes it. */
export function MemberAccessLevel({ accessLevel }: MemberAccessLevelProps) {
  const { identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const { workspaceId, memberId, canChangeLevel } = useMemberCard();
  const change = useChangeAccessLevel(workspaceId);

  const shown = change.isPending ? change.variables.accessLevel : accessLevel;

  function moveTo(level: WorkspaceAccessLevel) {
    change.mutate(
      { memberId, accessLevel: level },
      {
        onSuccess: () =>
          void queryClient.invalidateQueries({
            queryKey: peopleQueryKeys.profile(identity, workspaceId, memberId),
          }),
      },
    );
  }

  return <AccessLevelBadge accessLevel={shown} editable={canChangeLevel} onChange={moveTo} />;
}
