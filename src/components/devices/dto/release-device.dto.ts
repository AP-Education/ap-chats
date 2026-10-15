import { Matches } from 'class-validator';

export const RELEASE_KEY_PATTERN = /^[0-9a-f]{64}$/u;

export class ReleaseDeviceDto {
  @Matches(RELEASE_KEY_PATTERN)
  releaseKey!: string;
}
