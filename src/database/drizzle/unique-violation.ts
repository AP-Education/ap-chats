import { ConflictException } from '@nestjs/common';

/** PostgreSQL's unique_violation, also when a driver wraps it as the cause. */
export function isUniqueViolation(error: unknown): boolean {
  const failure = error as { code?: string; cause?: { code?: string } };
  return failure.code === '23505' || failure.cause?.code === '23505';
}

export function throwConflictOnUnique(error: unknown, message: string): never {
  if (isUniqueViolation(error)) throw new ConflictException(message);
  throw error;
}
