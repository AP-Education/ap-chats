export const callStatusValues = ['ringing', 'active', 'ended', 'declined', 'missed'] as const;
export type CallStatus = (typeof callStatusValues)[number];
