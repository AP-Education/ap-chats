import { ConflictException } from '@nestjs/common';

export function throwConflictOnUnique(error: unknown, message: string): never {
  const cause = error as { code?: string; cause?: { code?: string } };
  if (cause.code === '23505' || cause.cause?.code === '23505') {
    throw new ConflictException(message);
  }
  throw error;
}
