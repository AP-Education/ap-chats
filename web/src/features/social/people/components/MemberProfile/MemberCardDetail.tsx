import { useMemberCard } from '../../stores/member-card-context';
import { MemberAccessLevel } from './MemberAccessLevel';

/** The line under the person's name: their access level once known, or that they are a bot. */
export function MemberCardDetail() {
  const { profile, isLoading, unavailable } = useMemberCard();

  if (isLoading) return null;
  if (unavailable || !profile) return 'Учасник недоступний';
  if (profile.isBot) return 'Асистент простору';

  return <MemberAccessLevel accessLevel={profile.accessLevel} />;
}
