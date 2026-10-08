// The call surface's brand colours. Calls render inside AppearanceScope('dark'), so
// glass, text and the base come from the dark theme's tokens; only the aurora and the
// answer colours are the calls' own. mobile/src/features/calls/callTheme.ts mirrors them.
export const CALL_PALETTE = {
  teal: '#0f8a83',
  cyan: '#09c6cc',
  indigo: '#3c34c9',
  danger: '#e5484d',
  dangerHover: '#ec5d5e',
  accept: '#2f9e6b',
  acceptHover: '#35b277',
  live: '#4ade80',
} as const;

export const CALL_AURORA = [
  'radial-gradient(55% 45% at 20% 14%, rgba(15, 138, 131, 0.55), transparent 72%)',
  'radial-gradient(40% 36% at 84% 22%, rgba(9, 198, 204, 0.2), transparent 72%)',
  'radial-gradient(65% 55% at 78% 92%, rgba(60, 52, 201, 0.34), transparent 72%)',
  'radial-gradient(45% 45% at 8% 88%, rgba(15, 138, 131, 0.22), transparent 72%)',
].join(', ');
