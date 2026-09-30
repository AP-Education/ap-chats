import { z } from 'zod';

// Validates a call:* payload at the boundary, since TS types alone won't catch
// drift from the API. Shared shape across call:incoming/accepted/declined/ended.
export const callSignalSchema = z.object({
  workspaceId: z.string(),
  channelId: z.string(),
  channelKind: z.string(),
  callId: z.string(),
  roomName: z.string(),
  startedByMemberId: z.string(),
  startedByDisplayName: z.string().nullable(),
  startedByAvatarPath: z.string().nullable(),
});

export type CallSignal = z.infer<typeof callSignalSchema>;
