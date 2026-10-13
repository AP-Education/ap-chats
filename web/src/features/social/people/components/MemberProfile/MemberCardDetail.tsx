import { useMemberCard } from '../../stores/member-card-context';
import { MemberAccessLevel } from './MemberAccessLevel';

/** The line under the person's name: their access level, once known. */
export function MemberCardDetail() {
  const { profile, isLoading, unavailable } = useMemberCard();

  if (isLoading) return null;
  if (unavailable || !profile) return 'Учасник недоступний';

  return <MemberAccessLevel accessLevel={profile.accessLevel} />;
}
