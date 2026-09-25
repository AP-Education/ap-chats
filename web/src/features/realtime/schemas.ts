import { z } from 'zod';

// Validates payloads at the boundary, since TS types alone won't catch drift from the API.
export const sessionReadySchema = z.object({
  userId: z.string(),
  appId: z.string(),
});
