import { useCurrentUser } from '@ap-education/shell-sdk';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { apiRequest, jsonInit } from '@/shared/api/http';

const synchronizedTokens = new Set<string>();

export function UserProfileSync() {
  const user = useCurrentUser();
  if (user.status !== 'signed-in' || !user.idToken) return null;

  return (
    <SignedInProfileSync
      accessToken={user.accessToken}
      idToken={user.idToken}
      identity={user.queryIdentity}
    />
  );
}

function SignedInProfileSync({
  accessToken,
  idToken,
  identity,
}: {
  accessToken: string;
  idToken: string;
  identity: string;
}) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (synchronizedTokens.has(idToken)) return;
    synchronizedTokens.add(idToken);
    void apiRequest<void>('/api/user-profile/me', accessToken, jsonInit('PUT', { idToken })).then(
      () => {
        void queryClient.invalidateQueries({ queryKey: ['workspace-members', identity] });
        void queryClient.invalidateQueries({ queryKey: ['messaging', identity] });
        void queryClient.invalidateQueries({ queryKey: ['pins', identity] });
      },
      () => synchronizedTokens.delete(idToken),
    );
  }, [accessToken, idToken, identity, queryClient]);

  return null;
}
