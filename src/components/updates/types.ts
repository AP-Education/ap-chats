/** Native shells that take over-the-air updates; the desktop shell joins when it exists. */
export const shellPlatforms = ['ios', 'android'] as const;
export type ShellPlatform = (typeof shellPlatforms)[number];
