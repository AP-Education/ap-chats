import { useTranslation } from 'react-i18next';

import { useMemberCard } from '../../stores/member-card-context';
import { MemberAccessLevel } from './MemberAccessLevel';

/** The line under the person's name: their access level once known, or that they are a bot. */
export function MemberCardDetail() {
  const { t } = useTranslation('people');
  const { profile, isLoading, unavailable } = useMemberCard();

  if (isLoading) return null;
  if (unavailable || !profile) return t(($) => $.memberUnavailable);
  if (profile.isBot) return t(($) => $.workspaceAssistant);

  return <MemberAccessLevel accessLevel={profile.accessLevel} />;
}
