import { ApiError } from '@/shared/api/http';

/** The server refuses a second channel of the same name in one workspace. */
export function isChannelNameTaken(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409;
}
