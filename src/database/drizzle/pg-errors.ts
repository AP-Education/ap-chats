import { ConflictException, NotFoundException } from '@nestjs/common';

function hasCode(error: unknown, code: string): boolean {
  const cause = error as { code?: string; cause?: { code?: string } };
  return cause.code === code || cause.cause?.code === code;
}

export function throwConflictOnUnique(error: unknown, message: string): never {
  if (hasCode(error, '23505')) throw new ConflictException(message);
  throw error;
}

export function throwNotFoundOnMissingReference(error: unknown, message: string): never {
  if (hasCode(error, '23503')) throw new NotFoundException(message);
  throw error;
}
