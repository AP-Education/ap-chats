import { useCurrentUser } from '../stores/current-user-context';

export function useQueryAuth() {
  const user = useCurrentUser();
  if (user.status !== 'signed-in') {
    return { token: undefined, identity: undefined };
  }

  return {
    token: user.accessToken,
    identity: user.queryIdentity,
  };
}
