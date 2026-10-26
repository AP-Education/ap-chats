export const PLACEHOLDER_OIDC_PREFIX = 'discord:';

export function placeholderOidcUserId(discordUserId: string): string {
  return `${PLACEHOLDER_OIDC_PREFIX}${discordUserId}`;
}
